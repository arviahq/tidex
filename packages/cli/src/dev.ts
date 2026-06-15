import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";
import { createServer, mergeConfig, type ViteDevServer, type PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { applyPlugins, tideVitePlugin, getTideDir } from "@tide/core";
import { tideVisualPlugin } from "@tide/visual";
import { generateArtifacts } from "@tide/scanner";
import { loadConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Walk up from the run directory to the nearest tsconfig.json so we honor the
// user project's path aliases (e.g. `src/*`) even when tide is run from a
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

export interface DevServerOptions {
  cwd?: string;
}

export async function startDevServer(options: DevServerOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig(cwd);
  const pluginCtx = applyPlugins(config);
  const tideDir = getTideDir(cwd);
  const projectRoot = findProjectRoot(cwd);

  await generateArtifacts(config);
  await pluginCtx.runGenerateHooks();

  const managerRoot = path.resolve(__dirname, "../../manager");
  const previewRoot = path.resolve(__dirname, "../../preview");

  const previewUrl = `http://localhost:${config.previewPort ?? 6007}`;

  const sharedPluginOptions = {
    root: cwd,
    tideDir,
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
    configFile: path.join(managerRoot, "vite.config.ts"),
    server: {
      port: config.managerPort ?? 6006,
      strictPort: true,
    },
    define: {
      __TIDE_ROOT__: JSON.stringify(cwd),
      __TIDE_PREVIEW_URL__: JSON.stringify(`http://localhost:${config.previewPort ?? 6007}`),
    },
    plugins: [tideVitePlugin(sharedPluginOptions), tideVisualPlugin(visualPluginOptions)],
  });

  previewServer = await createServer(
    mergeConfig(
      {
        root: previewRoot,
        configFile: path.join(previewRoot, "vite.config.ts"),
        server: {
          port: config.previewPort ?? 6007,
          strictPort: true,
          cors: true,
          fs: {
            allow: [previewRoot, cwd, tideDir, projectRoot],
          },
        },
        define: {
          __TIDE_ROOT__: JSON.stringify(cwd),
        },
        plugins: [tideVitePlugin(sharedPluginOptions), userPathsPlugin(projectRoot)],
        resolve: {
          alias: {
            "@user": cwd,
            "virtual:tide-stories": path.join(tideDir, "stories.generated.ts"),
          },
          dedupe: ["react", "react-dom"],
        },
      },
      config.preview?.vite ?? {},
    ),
  );

  await managerServer.listen();
  await previewServer.listen();

  const managerPort = managerServer.config.server.port;
  const previewPort = previewServer.config.server.port;

  console.log(`\n  Tide Manager:  http://localhost:${managerPort}`);
  console.log(`  Tide Preview:  http://localhost:${previewPort}\n`);

  const watcher = chokidar.watch(
    [
      ...config.scan.include.map((p) => path.join(cwd, p)),
      path.join(cwd, "tide.config.ts"),
      path.join(cwd, "tide.config.js"),
      path.join(cwd, "tide.config.mjs"),
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
      console.log("  [tide] Re-scanning components...");
      const latestConfig = await loadConfig(cwd);
      await generateArtifacts(latestConfig);
      // Tell the manager to refetch its data in place rather than full-reloading
      // it — a reload would throw away the selected story, the user's control
      // values, and the preview handshake state on every save. The preview still
      // full-reloads so the edited component code re-enters its module graph; the
      // manager re-syncs the preserved story + args once the preview re-announces.
      managerServer?.ws.send({ type: "custom", event: "tide:data-changed" });
      await previewServer?.ws.send({ type: "full-reload" });
    }, 300);
  });
}

export async function runGenerate(cwd?: string, verbose?: boolean): Promise<void> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  const result = await generateArtifacts(config, { verbose });
  console.log(`Generated ${result.manifest.components.length} components`);
  console.log(`  manifest: ${getTideDir(root)}/manifest.json`);
  console.log(`  props:    ${getTideDir(root)}/props.json`);
  console.log(`  stories:  ${result.storiesPath}`);
  if (result.diagnostics.warnings.length > 0 && !verbose) {
    console.log(
      `  warnings: ${result.diagnostics.warnings.length} (run \`tide generate --verbose\`)`,
    );
  }
}

export async function runInit(cwd?: string): Promise<void> {
  const root = cwd ?? process.cwd();
  const configPath = path.join(root, "tide.config.ts");

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      `import { defineConfig } from "@tide/core";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**"],
    componentsDir: "src/components",
  },
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TideWrapper.tsx",
  },
});
`,
    );
    console.log("Created tide.config.ts");
  }

  const scaffoldFiles: Array<{ file: string; content: string }> = [
    {
      file: "src/preview/TideWrapper.tsx",
      content: `import type { ReactNode } from "react";

export default function TideWrapper({ children }: { children: ReactNode }) {
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
  const tideGitignoreBlock = `# Tide generated artifacts (commit baselines + interaction wiring)
.tide/*
!.tide/baselines/
!.tide/baselines/**
!.tide/interactions/
!.tide/interactions/**
`;

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".tide")) {
      fs.appendFileSync(gitignorePath, `\n${tideGitignoreBlock}`);
      console.log("Added .tide/ rules to .gitignore (baselines are tracked)");
    }
  } else {
    fs.writeFileSync(gitignorePath, tideGitignoreBlock);
  }

  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      scripts?: Record<string, string>;
    };
    pkg.scripts ??= {};
    if (!pkg.scripts["tide"]) {
      pkg.scripts["tide"] = "tide dev";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      console.log('Added "tide" script to package.json');
    }
  }

  console.log("");
  console.log("Next steps:");
  console.log("  1. Add components under src/components/");
  console.log("  2. Run tide generate && tide dev");
  console.log("  See docs/design-systems.md for folder structure guidance.");
}

export async function runVisual(cwd?: string, update?: boolean): Promise<number> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  await generateArtifacts(config);
  const { readManifest } = await import("./config.js");
  const manifest = readManifest(root);
  const { runVisualTests, hasVisualDiffs, formatVisualSummary } = await import("@tide/visual");

  // Start preview server temporarily for visual tests
  const previewRoot = path.resolve(__dirname, "../../preview");
  const tideDir = getTideDir(root);
  const previewPort = config.previewPort ?? 6007;
  const projectRoot = findProjectRoot(root);
  const previewServer = await createServer(
    mergeConfig(
      {
        root: previewRoot,
        configFile: path.join(previewRoot, "vite.config.ts"),
        server: {
          port: previewPort,
          strictPort: false,
          fs: { allow: [previewRoot, root, projectRoot] },
        },
        define: { __TIDE_ROOT__: JSON.stringify(root) },
        plugins: [tideVitePlugin({ root, tideDir }), userPathsPlugin(projectRoot)],
      },
      config.preview?.vite ?? {},
    ),
  );
  await previewServer.listen();
  const port = previewServer.config.server.port;

  try {
    const report = await runVisualTests({
      root,
      previewUrl: `http://localhost:${port}`,
      manifest,
      update,
      threshold: config.visual?.threshold,
    });

    console.log(formatVisualSummary(report));

    return hasVisualDiffs(report) ? 1 : 0;
  } finally {
    await previewServer.close();
  }
}

export async function runTest(cwd?: string): Promise<number> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  await generateArtifacts(config);
  const { readManifest } = await import("./config.js");
  const manifest = readManifest(root);
  const {
    runA11yTests,
    hasA11yViolations,
    formatA11ySummary,
    runInteractionTests,
    hasInteractionFailures,
    formatInteractionSummary,
  } = await import("@tide/testing");

  const previewRoot = path.resolve(__dirname, "../../preview");
  const tideDir = getTideDir(root);
  const previewPort = config.previewPort ?? 6007;
  const projectRoot = findProjectRoot(root);
  const previewServer = await createServer(
    mergeConfig(
      {
        root: previewRoot,
        configFile: path.join(previewRoot, "vite.config.ts"),
        server: {
          port: previewPort,
          strictPort: false,
          fs: { allow: [previewRoot, root, projectRoot] },
        },
        define: { __TIDE_ROOT__: JSON.stringify(root) },
        plugins: [tideVitePlugin({ root, tideDir }), userPathsPlugin(projectRoot)],
      },
      config.preview?.vite ?? {},
    ),
  );
  await previewServer.listen();
  const port = previewServer.config.server.port;
  const previewUrl = `http://localhost:${port}`;

  // Run each suite independently so a failure in one doesn't mask the other.
  let failed = false;
  try {
    try {
      const a11yReport = await runA11yTests({ root, previewUrl, manifest });
      console.log(formatA11ySummary(a11yReport));
      if (hasA11yViolations(a11yReport)) failed = true;
    } catch (err) {
      console.error("Accessibility tests failed to run:", err instanceof Error ? err.message : err);
      failed = true;
    }

    try {
      const interactionReport = await runInteractionTests({ root, previewUrl, manifest });
      console.log(formatInteractionSummary(interactionReport));
      if (hasInteractionFailures(interactionReport)) failed = true;
    } catch (err) {
      console.error("Interaction tests failed to run:", err instanceof Error ? err.message : err);
      failed = true;
    }

    return failed ? 1 : 0;
  } finally {
    await previewServer.close();
  }
}

export async function runBuild(cwd?: string): Promise<void> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  await generateArtifacts(config);
  console.log("Build artifacts generated in .tide/");
}
