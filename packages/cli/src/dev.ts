import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import chokidar from "chokidar";
import {
  createServer,
  mergeConfig,
  loadConfigFromFile,
  searchForWorkspaceRoot,
  normalizePath,
  type ViteDevServer,
  type PluginOption,
  type InlineConfig,
  type Plugin,
} from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import {
  applyPlugins,
  tidexVitePlugin,
  getTidexDir,
  getBindingsPath,
  getPropsPath,
  type BindingsMap,
  type PropsMap,
} from "@tidex/core";
import { tidexVisualPlugin } from "@tidex/visual";
import { generateArtifacts } from "@tidex/scanner";
import { loadConfig } from "./config.js";
import { startProgress } from "./progress.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Locate the manager/preview UI packages. `require.resolve` works both in the
// monorepo (workspace symlink) and in a published install where they're CLI
// dependencies; the `../../<pkg>` fallback keeps a bare source checkout working.
// The CLI builds these servers' Vite configs programmatically (configFile:
// false), so the packages only need to ship their source + index.html — not a
// vite.config.ts.
function resolveUiRoot(pkg: string, fallbackRelative: string): string {
  try {
    return path.dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    return path.resolve(__dirname, fallbackRelative);
  }
}

const resolveManagerRoot = () => resolveUiRoot("@tidex/manager", "../../manager");
const resolvePreviewRoot = () => resolveUiRoot("@tidex/preview", "../../preview");

// Base plugins for the preview/visual/test servers: the user project's own Vite
// plugins so components compile exactly as the project builds them (custom
// transforms like design-system DSLs, vanilla-extract, MDX, etc.). Vite
// evaluates the project's config rooted at the project, so plugin paths resolve
// correctly. Falls back to the bundled React plugin when the project has no Vite
// config. The project's React plugin (if any) is reused, so we don't add ours.
async function loadProjectBasePlugins(projectRoot: string): Promise<PluginOption[]> {
  try {
    const loaded = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      undefined,
      projectRoot,
    );
    const plugins = (loaded?.config.plugins ?? []) as PluginOption[];
    if (plugins.length > 0) return plugins;
  } catch (err) {
    console.warn(
      `  [tidex] Could not load the project's Vite plugins; falling back to the React plugin. ${
        err instanceof Error ? err.message : err
      }`,
    );
  }
  return [react()];
}

/** Read and parse a JSON artifact, returning null when missing or invalid. */
function readJson<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

// Walk up from the run directory to the nearest tsconfig.json so we honor the
// user project's path aliases (e.g. `src/*`) even when tidex is run from a
// subdirectory like `src/`.
function findProjectRoot(cwd: string): string {
  let dir = cwd;
  for (;;) {
    if (fs.existsSync(path.join(dir, "tsconfig.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return cwd;
    dir = parent;
  }
}

// Resolve the user project's tsconfig `paths`/`baseUrl` for component imports.
// Rooted at the project (not the preview app) so aliases like `src/i18n`
// resolve. `loose` keeps unresolved specifiers from hard-failing the server.
function userPathsPlugin(projectRoot: string): PluginOption {
  return tsconfigPaths({ root: projectRoot, loose: true });
}

// Serve the Tidex preview harness HTML at `/` even though the Vite `root` is the
// user's project (so the project's own plugins resolve paths relative to the
// project, exactly as `vite dev` would). With `appType: "custom"` Vite no longer
// auto-serves an index.html, so this post-middleware does it: it reads the
// harness `index.html` from `@tidex/preview`, rewrites the relative entry to an
// absolute `/@fs/` URL (resolved against the harness, not the project), and runs
// it through `transformIndexHtml` so plugin-react injects the refresh preamble +
// HMR client. All consumers navigate to `/?story=...`, so only `/` needs serving.
function previewHostPlugin(previewRoot: string): Plugin {
  const htmlPath = path.join(previewRoot, "index.html");
  const entryFsUrl = "/@fs/" + normalizePath(path.join(previewRoot, "src/main.tsx"));
  return {
    name: "tidex:preview-host",
    configureServer(server) {
      // Returning a function registers a POST-middleware: it runs after Vite's
      // own middlewares (transform, /@fs, /@vite, /@id, /node_modules), so real
      // module/asset requests are already handled and only HTML navigations fall
      // through to us.
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== "GET" && req.method !== "HEAD") return next();
          const pathname = (req.url ?? "/").split("?")[0] ?? "/";
          if (
            pathname.startsWith("/@") ||
            pathname.startsWith("/node_modules/") ||
            pathname.startsWith("/__tidex/") ||
            pathname.startsWith("/src/") ||
            path.extname(pathname) !== ""
          ) {
            return next();
          }
          if (!(req.headers.accept ?? "").includes("text/html")) return next();
          try {
            let html = fs.readFileSync(htmlPath, "utf-8");
            html = html.replace(
              /<script\s+type="module"\s+src="\/src\/main\.tsx"><\/script>/,
              `<script type="module" src="${entryFsUrl}"></script>`,
            );
            html = await server.transformIndexHtml(req.url ?? "/", html, req.originalUrl);
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            res.setHeader("Cache-Control", "no-store");
            res.end(html);
          } catch (err) {
            next(err as Error);
          }
        });
      };
    },
  };
}

interface PreviewConfigOptions {
  cwd: string;
  projectRoot: string;
  tidexDir: string;
  previewRoot: string;
  previewBasePlugins: PluginOption[];
  port: number;
  strictPort: boolean;
  cors?: boolean;
}

// Shared Vite config for the three preview servers (live dev, visual, test).
// Rooted at the user project so the project's own plugins resolve paths the same
// way the project's build does; the harness is served by `previewHostPlugin`.
function buildPreviewConfig(opts: PreviewConfigOptions): InlineConfig {
  return {
    root: opts.cwd,
    appType: "custom",
    configFile: false,
    server: {
      port: opts.port,
      strictPort: opts.strictPort,
      cors: opts.cors ?? true,
      fs: {
        allow: [
          searchForWorkspaceRoot(opts.cwd),
          opts.previewRoot,
          opts.cwd,
          opts.tidexDir,
          opts.projectRoot,
        ],
      },
    },
    define: {
      __TIDEX_ROOT__: JSON.stringify(opts.cwd),
    },
    plugins: [
      ...opts.previewBasePlugins,
      tidexVitePlugin({ root: opts.cwd, tidexDir: opts.tidexDir }),
      userPathsPlugin(opts.projectRoot),
      previewHostPlugin(opts.previewRoot),
    ],
    optimizeDeps: {
      entries: [path.join(opts.previewRoot, "src/main.tsx")],
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "@testing-library/dom",
        "@testing-library/user-event",
      ],
    },
    resolve: {
      // `virtual:tidex-stories` is resolved by tidexVitePlugin (resolveId/load),
      // so no alias for it is needed. `dedupe` keeps a single React instance
      // resolved from the project, shared by the harness and user components.
      alias: { "@user": opts.cwd },
      dedupe: ["react", "react-dom"],
    },
  };
}

export interface DevServerOptions {
  cwd?: string;
}

export async function startDevServer(options: DevServerOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig(cwd);
  const pluginCtx = applyPlugins(config);
  const tidexDir = getTidexDir(cwd);
  const projectRoot = findProjectRoot(cwd);

  await generateArtifacts(config);
  await pluginCtx.runGenerateHooks();

  const managerRoot = resolveManagerRoot();
  const previewRoot = resolvePreviewRoot();

  const previewUrl = `http://localhost:${config.previewPort ?? 6007}`;

  const sharedPluginOptions = {
    root: cwd,
    tidexDir,
  };

  const visualPluginOptions = {
    root: cwd,
    previewUrl,
    threshold: config.visual?.threshold,
  };

  let managerServer: ViteDevServer | undefined;
  let previewServer: ViteDevServer | undefined;

  managerServer = await createServer({
    root: managerRoot,
    configFile: false,
    server: {
      port: config.managerPort ?? 6006,
      strictPort: true,
    },
    define: {
      __TIDEX_ROOT__: JSON.stringify(cwd),
      __TIDEX_PREVIEW_URL__: JSON.stringify(`http://localhost:${config.previewPort ?? 6007}`),
    },
    plugins: [
      react(),
      tidexVitePlugin(sharedPluginOptions),
      tidexVisualPlugin(visualPluginOptions),
    ],
  });

  const previewBasePlugins = await loadProjectBasePlugins(projectRoot);
  previewServer = await createServer(
    mergeConfig(
      buildPreviewConfig({
        cwd,
        projectRoot,
        tidexDir,
        previewRoot,
        previewBasePlugins,
        port: config.previewPort ?? 6007,
        strictPort: true,
        cors: true,
      }),
      config.preview?.vite ?? {},
    ),
  );

  await managerServer.listen();
  await previewServer.listen();

  const managerPort = managerServer.config.server.port;
  const previewPort = previewServer.config.server.port;

  console.log(`\n  Tidex Manager:  http://localhost:${managerPort}`);
  console.log(`  Tidex Preview:  http://localhost:${previewPort}\n`);

  const watcher = chokidar.watch(
    [
      ...config.scan.include.map((p) => path.join(cwd, p)),
      path.join(cwd, "tidex.config.ts"),
      path.join(cwd, "tidex.config.js"),
      path.join(cwd, "tidex.config.mjs"),
      ...(config.tokens
        ? [path.isAbsolute(config.tokens) ? config.tokens : path.join(cwd, config.tokens)]
        : []),
      ...(config.preview?.wrapper
        ? [
            path.isAbsolute(config.preview.wrapper)
              ? config.preview.wrapper
              : path.join(cwd, config.preview.wrapper),
          ]
        : []),
    ],
    { ignoreInitial: true },
  );

  let debounce: ReturnType<typeof setTimeout> | undefined;
  watcher.on("all", () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      console.log("  [tidex] Re-scanning components...");
      const latestConfig = await loadConfig(cwd);
      await generateArtifacts(latestConfig);
      // Tell the manager to refetch its data in place rather than full-reloading
      // it — a reload would throw away the selected story, the user's control
      // values, and the preview handshake state on every save. The preview still
      // full-reloads so the edited component code re-enters its module graph; the
      // manager re-syncs the preserved story + args once the preview re-announces.
      managerServer?.ws.send({ type: "custom", event: "tidex:data-changed" });
      await previewServer?.ws.send({ type: "full-reload" });
    }, 300);
  });
}

export async function runGenerate(cwd?: string, verbose?: boolean): Promise<void> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  const progress = startProgress("Analyzing components");
  let result;
  try {
    result = await generateArtifacts(config, {
      verbose,
      onProgress: (done, total, label) => progress.update(done, total, label),
    });
  } finally {
    progress.stop();
  }
  console.log(`Generated ${result.manifest.components.length} components`);
  console.log(`  manifest: ${getTidexDir(root)}/manifest.json`);
  console.log(`  props:    ${getTidexDir(root)}/props.json`);
  console.log(`  stories:  ${result.storiesPath}`);
  if (result.diagnostics.warnings.length > 0 && !verbose) {
    console.log(
      `  warnings: ${result.diagnostics.warnings.length} (run \`tidex generate --verbose\`)`,
    );
  }
}

export async function runInit(cwd?: string): Promise<void> {
  const root = cwd ?? process.cwd();
  const configPath = path.join(root, "tidex.config.ts");

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      `import { defineConfig } from "@tidex/cli/config";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**"],
    componentsDir: "src/components",
  },
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TidexWrapper.tsx",
  },
});
`,
    );
    console.log("Created tidex.config.ts");
  }

  const scaffoldFiles: Array<{ file: string; content: string }> = [
    {
      file: "src/preview/TidexWrapper.tsx",
      content: `import type { ReactNode } from "react";
// Tidex's equivalent of \`.storybook/preview\`: import your design system's
// global styles/theme here and wrap components in any required providers, so
// the preview renders them exactly as your app does.
//   import "../styles/global.css";

export default function TidexWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
`,
    },
    {
      file: "src/components/.gitkeep",
      content: "",
    },
    {
      file: "tokens.json",
      content: `{
  "colors": {
    "primary": "#4f46e5",
    "text": "#0f172a",
    "bg": "#ffffff"
  },
  "spacing": {
    "sm": "8px",
    "md": "16px",
    "lg": "24px"
  }
}
`,
    },
  ];

  for (const { file, content } of scaffoldFiles) {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
      console.log(`Created ${file}`);
    }
  }

  const gitignorePath = path.join(root, ".gitignore");
  const tidexGitignoreBlock = `# Tidex generated artifacts (commit baselines + interaction wiring)
.tidex/*
!.tidex/baselines/
!.tidex/baselines/**
!.tidex/interactions/
!.tidex/interactions/**
`;

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".tidex")) {
      fs.appendFileSync(gitignorePath, `\n${tidexGitignoreBlock}`);
      console.log("Added .tidex/ rules to .gitignore (baselines are tracked)");
    }
  } else {
    fs.writeFileSync(gitignorePath, tidexGitignoreBlock);
  }

  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      scripts?: Record<string, string>;
    };
    pkg.scripts ??= {};
    if (!pkg.scripts["tidex"]) {
      pkg.scripts["tidex"] = "tidex dev";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      console.log('Added "tidex" script to package.json');
    }
  }

  console.log("");
  console.log("Next steps:");
  console.log("  1. Add components under src/components/");
  console.log("  2. Run tidex generate && tidex dev");
  console.log("  See docs/design-systems.md for folder structure guidance.");
}

export async function runVisual(cwd?: string, update?: boolean): Promise<number> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  await generateArtifacts(config);
  const { readManifest } = await import("./config.js");
  const manifest = readManifest(root);
  const { runVisualTests, hasVisualDiffs, formatVisualSummary } = await import("@tidex/visual");

  // Start preview server temporarily for visual tests
  const previewRoot = resolvePreviewRoot();
  const tidexDir = getTidexDir(root);
  const previewPort = config.previewPort ?? 6007;
  const projectRoot = findProjectRoot(root);
  const previewBasePlugins = await loadProjectBasePlugins(projectRoot);
  const previewServer = await createServer(
    mergeConfig(
      buildPreviewConfig({
        cwd: root,
        projectRoot,
        tidexDir,
        previewRoot,
        previewBasePlugins,
        port: previewPort,
        strictPort: false,
      }),
      config.preview?.vite ?? {},
    ),
  );
  await previewServer.listen();
  const port = previewServer.config.server.port;

  const progress = startProgress(update ? "Updating baselines" : "Visual tests");
  try {
    const report = await runVisualTests({
      root,
      previewUrl: `http://localhost:${port}`,
      manifest,
      update,
      threshold: config.visual?.threshold,
      onProgress: (done, total, label) => progress.update(done, total, label),
    });

    progress.stop();
    console.log(formatVisualSummary(report));

    return hasVisualDiffs(report) ? 1 : 0;
  } finally {
    progress.stop();
    await previewServer.close();
  }
}

export async function runTest(
  cwd?: string,
  options: { skipGenerate?: boolean; workers?: number } = {},
): Promise<number> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  if (!options.skipGenerate) {
    await generateArtifacts(config);
  }
  const { readManifest } = await import("./config.js");
  const manifest = readManifest(root);
  const {
    createTestBrowser,
    defaultWorkers,
    runA11yTests,
    hasA11yViolations,
    formatA11ySummary,
    runInteractionTests,
    hasInteractionFailures,
    formatInteractionSummary,
    verifyInteractions,
    formatVerifySummary,
  } = await import("@tidex/testing");

  const previewRoot = resolvePreviewRoot();
  const tidexDir = getTidexDir(root);
  const previewPort = config.previewPort ?? 6007;
  const projectRoot = findProjectRoot(root);
  const previewBasePlugins = await loadProjectBasePlugins(projectRoot);
  const previewServer = await createServer(
    mergeConfig(
      buildPreviewConfig({
        cwd: root,
        projectRoot,
        tidexDir,
        previewRoot,
        previewBasePlugins,
        port: previewPort,
        strictPort: false,
      }),
      config.preview?.vite ?? {},
    ),
  );
  await previewServer.listen();
  const port = previewServer.config.server.port;
  const previewUrl = `http://localhost:${port}`;
  const workers = defaultWorkers(options.workers ?? config.test?.workers);
  const suiteBase = { root, previewUrl, manifest, workers };

  let failed = false;
  const testBrowser = await createTestBrowser();
  try {
    const a11yProgress = startProgress("Accessibility");
    const interactionProgress = startProgress("Interactions");

    const [a11yOk, interactionOk] = await Promise.all([
      (async () => {
        try {
          const a11yReport = await runA11yTests({
            ...suiteBase,
            browser: testBrowser,
            onProgress: (done, total, label) => a11yProgress.update(done, total, label),
          });
          a11yProgress.stop();
          console.log(formatA11ySummary(a11yReport));
          return !hasA11yViolations(a11yReport);
        } catch (err) {
          a11yProgress.stop();
          console.error(
            "Accessibility tests failed to run:",
            err instanceof Error ? err.message : err,
          );
          return false;
        }
      })(),
      (async () => {
        try {
          const interactionReport = await runInteractionTests({
            ...suiteBase,
            browser: testBrowser,
            onProgress: (done, total, label) => interactionProgress.update(done, total, label),
          });
          interactionProgress.stop();
          console.log(formatInteractionSummary(interactionReport));
          return !hasInteractionFailures(interactionReport);
        } catch (err) {
          interactionProgress.stop();
          console.error(
            "Interaction tests failed to run:",
            err instanceof Error ? err.message : err,
          );
          return false;
        }
      })(),
    ]);

    if (!a11yOk || !interactionOk) failed = true;

    // Verify inferred interaction bindings and capture their generated states.
    // Advisory: it tunes binding confidence but never fails the suite.
    const bindings = readJson<BindingsMap>(getBindingsPath(root)) ?? {};
    if (Object.keys(bindings).length > 0) {
      const verifyProgress = startProgress("Verifying interactions");
      try {
        const props = readJson<PropsMap>(getPropsPath(root)) ?? {};
        const { report, bindings: tuned } = await verifyInteractions({
          ...suiteBase,
          browser: testBrowser,
          bindings,
          props,
          onProgress: (done, total, label) => verifyProgress.update(done, total, label),
        });
        verifyProgress.stop();
        fs.writeFileSync(getBindingsPath(root), JSON.stringify(tuned, null, 2));
        console.log(formatVerifySummary(report));
      } catch (err) {
        verifyProgress.stop();
        console.error(
          "Interaction verification failed to run:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    return failed ? 1 : 0;
  } finally {
    await testBrowser.close();
    await previewServer.close();
  }
}

export async function runBuild(cwd?: string): Promise<void> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  await generateArtifacts(config);
  console.log("Build artifacts generated in .tidex/");
}
