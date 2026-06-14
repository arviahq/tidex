import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";
import { createServer, type ViteDevServer } from "vite";
import { applyPlugins, tideVitePlugin, getTideDir } from "@tide/core";
import { generateArtifacts } from "@tide/scanner";
import { loadConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DevServerOptions {
  cwd?: string;
}

export async function startDevServer(options: DevServerOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig(cwd);
  const pluginCtx = applyPlugins(config);
  const tideDir = getTideDir(cwd);

  await generateArtifacts(config);
  await pluginCtx.runGenerateHooks();

  const managerRoot = path.resolve(__dirname, "../../manager");
  const previewRoot = path.resolve(__dirname, "../../preview");

  const sharedPluginOptions = {
    root: cwd,
    tideDir,
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
    plugins: [tideVitePlugin(sharedPluginOptions)],
  });

  previewServer = await createServer({
    root: previewRoot,
    configFile: path.join(previewRoot, "vite.config.ts"),
    server: {
      port: config.previewPort ?? 6007,
      strictPort: true,
      cors: true,
      fs: {
        allow: [previewRoot, cwd, tideDir],
      },
    },
    define: {
      __TIDE_ROOT__: JSON.stringify(cwd),
    },
    plugins: [tideVitePlugin(sharedPluginOptions)],
    resolve: {
      alias: {
        "@user": cwd,
        "virtual:tide-stories": path.join(tideDir, "stories.generated.ts"),
      },
      dedupe: ["react", "react-dom"],
    },
  });

  await managerServer.listen();
  await previewServer.listen();

  const managerPort = managerServer.config.server.port;
  const previewPort = previewServer.config.server.port;

  console.log(`\n  Tide Manager:  http://localhost:${managerPort}`);
  console.log(`  Tide Preview:  http://localhost:${previewPort}\n`);

  const watcher = chokidar.watch(
    config.scan.include.map((p) => path.join(cwd, p)),
    { ignoreInitial: true },
  );

  let debounce: ReturnType<typeof setTimeout> | undefined;
  watcher.on("all", () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      console.log("  [tide] Re-scanning components...");
      await generateArtifacts(config);
      await managerServer?.ws.send({ type: "full-reload" });
      await previewServer?.ws.send({ type: "full-reload" });
    }, 300);
  });
}

export async function runGenerate(cwd?: string): Promise<void> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  const result = await generateArtifacts(config);
  console.log(`Generated ${result.manifest.components.length} components`);
  console.log(`  manifest: ${getTideDir(root)}/manifest.json`);
  console.log(`  props:    ${getTideDir(root)}/props.json`);
  console.log(`  stories:  ${result.storiesPath}`);
}

export async function runInit(cwd?: string): Promise<void> {
  const root = cwd ?? process.cwd();
  const configPath = path.join(root, "tide.config.ts");

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      `import { defineConfig } from "@tide/core";

export default defineConfig({
  scan: { include: ["src/**/*.tsx"] },
});
`,
    );
    console.log("Created tide.config.ts");
  }

  const gitignorePath = path.join(root, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".tide")) {
      fs.appendFileSync(gitignorePath, "\n.tide/\n");
      console.log("Added .tide/ to .gitignore");
    }
  } else {
    fs.writeFileSync(gitignorePath, ".tide/\n");
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
}

export async function runVisual(cwd?: string, update?: boolean): Promise<number> {
  const root = cwd ?? process.cwd();
  const config = await loadConfig(root);
  await generateArtifacts(config);
  const { readManifest } = await import("./config.js");
  const manifest = readManifest(root);
  const { runVisualTests, hasVisualDiffs } = await import("@tide/visual");

  // Start preview server temporarily for visual tests
  const previewRoot = path.resolve(__dirname, "../../preview");
  const tideDir = getTideDir(root);
  const previewServer = await createServer({
    root: previewRoot,
    configFile: path.join(previewRoot, "vite.config.ts"),
    server: { port: config.previewPort ?? 6007, strictPort: false },
    define: { __TIDE_ROOT__: JSON.stringify(root) },
    plugins: [tideVitePlugin({ root, tideDir })],
  });
  await previewServer.listen();
  const port = previewServer.config.server.port;

  try {
    const report = await runVisualTests({
      root,
      previewUrl: `http://localhost:${port}`,
      manifest,
      update,
    });

    for (const [name, entry] of Object.entries(report)) {
      const status = entry.changed ? "CHANGED" : "OK";
      console.log(`  ${name}: ${status}${entry.changed ? ` (${entry.pixelsChanged} pixels)` : ""}`);
    }

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
  const { runA11yTests, hasA11yViolations, formatA11ySummary } = await import("@tide/testing");

  const previewRoot = path.resolve(__dirname, "../../preview");
  const tideDir = getTideDir(root);
  const previewServer = await createServer({
    root: previewRoot,
    configFile: path.join(previewRoot, "vite.config.ts"),
    server: { port: config.previewPort ?? 6007, strictPort: false },
    define: { __TIDE_ROOT__: JSON.stringify(root) },
    plugins: [tideVitePlugin({ root, tideDir })],
  });
  await previewServer.listen();
  const port = previewServer.config.server.port;

  try {
    const report = await runA11yTests({
      root,
      previewUrl: `http://localhost:${port}`,
      manifest,
    });
    console.log(formatA11ySummary(report));
    return hasA11yViolations(report) ? 1 : 0;
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
