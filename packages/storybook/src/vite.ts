import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfigFromFile, mergeConfig, type InlineConfig, type Plugin } from "vite";
import type { TideConfig } from "@tide/core";
import { resolveStorybookOptions } from "./discover.js";

// Plugins from the project's own vite.config that Tide must NOT re-apply: the
// React plugin (the preview app already provides it — duplicating it breaks
// Fast Refresh / doubles the transform) and build-only plugins like dts.
function isReusableProjectPlugin(name: string): boolean {
  if (name.startsWith("vite:react")) return false;
  if (name === "vite:dts" || name.includes("dts")) return false;
  return true;
}

async function flattenPlugins(input: unknown): Promise<Plugin[]> {
  const out: Plugin[] = [];
  for (const item of Array.isArray(input) ? input : [input]) {
    const resolved = await item;
    if (!resolved) continue;
    if (Array.isArray(resolved)) out.push(...(await flattenPlugins(resolved)));
    else out.push(resolved as Plugin);
  }
  return out;
}

// Reuse the project's own Vite plugins (vanilla-extract, svgr, etc.) so stories
// render with the same build pipeline Storybook uses (Storybook's builder-vite
// does the same). Best-effort: a failure here just means no extra plugins, and
// the user can always fall back to `preview.vite`.
export async function loadProjectVitePlugins(projectRoot: string): Promise<Plugin[]> {
  try {
    const loaded = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      undefined,
      projectRoot,
    );
    if (!loaded?.config?.plugins) return [];
    const flat = await flattenPlugins(loaded.config.plugins);
    return flat.filter((p) => p?.name && isReusableProjectPlugin(p.name));
  } catch (err) {
    console.warn(
      `  [tide] Could not reuse project vite.config plugins: ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}

/**
 * Inject react-docgen-typescript so component prop TYPES become argTypes — e.g.
 * a `size: "sm" | "md"` union renders as a select even when the story declares
 * no argType for it. This mirrors how Storybook's react-vite builder infers
 * controls. We resolve the plugin from the project (a Storybook react-vite repo
 * already ships it) to match its version; if absent, we skip silently.
 */
// The preview's Vite root is Tide's own dir, so react-docgen-typescript can't
// auto-find the project's tsconfig — point it at one that has compilerOptions
// (prefer an app/base config over a thin references-only root tsconfig).
function findProjectTsconfig(projectRoot: string): string | undefined {
  for (const name of ["tsconfig.app.json", "tsconfig.json", "tsconfig.base.json"]) {
    const file = path.join(projectRoot, name);
    try {
      if (fs.existsSync(file) && /"compilerOptions"/.test(fs.readFileSync(file, "utf-8"))) {
        return file;
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

// Import a package from the project's node_modules, honoring its `exports`
// `import` entry (the docgen plugin ships ESM-only, so `require.resolve` fails).
// Works for both flat (npm) and symlinked (pnpm) top-level layouts.
async function importFromProject(projectRoot: string, pkg: string): Promise<unknown> {
  const dir = path.join(projectRoot, "node_modules", pkg);
  const pj = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8")) as {
    exports?: { "."?: { import?: string; default?: string } };
    module?: string;
    main?: string;
  };
  const entry =
    pj.exports?.["."]?.import ?? pj.exports?.["."]?.default ?? pj.module ?? pj.main ?? "index.js";
  return import(pathToFileURL(path.join(dir, entry)).href);
}

async function loadReactDocgenPlugin(projectRoot: string): Promise<Plugin[]> {
  try {
    const mod = (await importFromProject(
      projectRoot,
      "@joshwooding/vite-plugin-react-docgen-typescript",
    )) as { default?: (opts?: unknown) => Plugin };
    const factory = (mod.default ?? mod) as (opts?: unknown) => Plugin;
    // Absolute globs: the preview's Vite root is Tide's own dir, so the plugin's
    // default (root-relative) filter would never match the project's files.
    // The parser options mirror Storybook's defaults so string-literal unions
    // (`"sm" | "md"`) become enum options instead of an opaque `other` type, and
    // inherited DOM props from node_modules are filtered out.
    return [
      factory({
        tsconfigPath: findProjectTsconfig(projectRoot),
        include: [path.join(projectRoot, "**/*.tsx"), path.join(projectRoot, "**/*.ts")],
        exclude: [path.join(projectRoot, "**/*.stories.*"), "**/node_modules/**"],
        shouldExtractLiteralValuesFromEnum: true,
        shouldRemoveUndefinedFromOptional: true,
        propFilter: (prop: { parent?: { fileName?: string } }) =>
          !prop.parent || !prop.parent.fileName?.includes("node_modules"),
      }),
    ];
  } catch {
    return [];
  }
}

/**
 * Extra preview/visual/test Vite config for a Storybook project: the project's
 * own build plugins plus react-docgen, merged under the user's explicit
 * `preview.vite` (which always takes precedence).
 */
export async function storybookPreviewVite(
  config: TideConfig,
  projectRoot: string,
): Promise<InlineConfig> {
  const sb = resolveStorybookOptions(config);
  const plugins: Plugin[] = [];
  if (sb.enabled && sb.viteConfig) {
    plugins.push(...(await loadProjectVitePlugins(projectRoot)));
    plugins.push(...(await loadReactDocgenPlugin(projectRoot)));
  }
  return mergeConfig({ plugins }, config.preview?.vite ?? {});
}
