import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import {
  buildDefaultArgs,
  getComponentId,
  getConfigSnapshotPath,
  getManifestPath,
  getPropsPath,
  getScanReportPath,
  getStoriesPath,
  getTideDir,
  DEFAULT_SCAN_EXCLUDE,
  type TideConfig,
  type Manifest,
  type PropsMap,
  type ComponentEntry,
} from "@tide/core";
import {
  discoverStories,
  resolveStorybookOptions,
  csfPreamble,
  csfStoryEntry,
} from "@tide/storybook";
import { discoverComponents } from "./discover.js";
import { extractProps } from "./extract-props.js";
import {
  buildScanDiagnostics,
  formatScanDiagnostics,
  type ScanDiagnostics,
} from "./diagnostics.js";

export interface GenerateResult {
  manifest: Manifest;
  props: PropsMap;
  storiesPath: string;
  diagnostics: ScanDiagnostics;
}

export interface GenerateOptions {
  verbose?: boolean;
}

let warnedFallback = false;
function warnFallbackOnce(include: string[], root: string, count: number) {
  if (warnedFallback) return;
  warnedFallback = true;
  console.warn(
    `[tide] scan.include ${JSON.stringify(include)} matched no files under ${root}; ` +
      `scanning "**/*.tsx" instead (${count} files). ` +
      `Add scan.include to tide.config.ts to silence this.`,
  );
}

export async function generateArtifacts(
  config: TideConfig,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const { root, scan } = config;
  const tideDir = getTideDir(root);
  fs.mkdirSync(tideDir, { recursive: true });

  // Ingest an existing Storybook (CSF) when enabled. Each story becomes its own
  // ComponentEntry keyed by `<title>/<story>`, so it flows through the sidebar,
  // controls, visual, and test pipelines like any other component.
  const sb = resolveStorybookOptions(config);
  let csfComponents: ComponentEntry[] = [];
  let csfProps: PropsMap = {};
  let csfDefaults: Record<string, Record<string, unknown>> = {};
  let previewPath: string | null = null;
  if (sb.enabled) {
    const storyResult = discoverStories(root, {
      configDir: sb.configDir,
      stories: sb.stories,
      ignore: scan.exclude,
    });
    csfComponents = storyResult.components;
    csfProps = storyResult.props;
    csfDefaults = storyResult.defaults;
    previewPath = storyResult.previewPath;
  }

  // A Storybook project's sidebar mirrors Storybook: show stories only, so we
  // don't list every component twice (once scanned, once as its story). The
  // convention scan still runs when there's no Storybook, or when the user opts
  // in with `storybook.scan: true`. Skipping it also avoids the costly prop
  // extraction over the whole `src` tree.
  const runScan = csfComponents.length === 0 || sb.scan === true;

  let files: string[] = [];
  let components: ComponentEntry[] = [];
  let props: PropsMap = {};
  if (runScan) {
    const ignore = [...DEFAULT_SCAN_EXCLUDE, ...(scan.exclude ?? [])];
    files = await fg(scan.include, { cwd: root, absolute: false, ignore });
    if (files.length === 0) {
      const fallback = await fg(["**/*.tsx"], { cwd: root, absolute: false, ignore });
      if (fallback.length > 0) {
        warnFallbackOnce(scan.include, root, fallback.length);
        files = fallback;
      }
    }
    components = discoverComponents(root, files, { componentsDir: scan.componentsDir });
    props = extractProps(root, components);
  }

  // Diagnostics describe the convention scan only — keep CSF entries out of the
  // "files with no components / unknown props" tallies.
  const diagnostics = buildScanDiagnostics(files, components, props);

  components.push(...csfComponents);
  Object.assign(props, csfProps);
  components.sort((a, b) => a.title.localeCompare(b.title));

  const manifest: Manifest = { components };
  // Story args win as defaults; an explicit user override in `config.defaults`
  // still takes precedence at id granularity.
  const mergedDefaults = { ...csfDefaults, ...config.defaults };

  fs.writeFileSync(getManifestPath(root), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(getPropsPath(root), JSON.stringify(props, null, 2));
  fs.writeFileSync(getScanReportPath(root), JSON.stringify(diagnostics, null, 2));
  fs.writeFileSync(
    getConfigSnapshotPath(root),
    JSON.stringify(
      {
        packageName: config.packageName ?? null,
        defaults: mergedDefaults,
        componentsDir: scan.componentsDir ?? null,
      },
      null,
      2,
    ),
  );

  const storiesContent = generateStoriesFile(root, manifest, props, config, {
    csfArgs: mergedDefaults,
    previewPath,
  });
  const storiesPath = getStoriesPath(root);
  fs.writeFileSync(storiesPath, storiesContent);

  if (config.tokens) {
    const tokensSrc = path.isAbsolute(config.tokens)
      ? config.tokens
      : path.join(root, config.tokens);
    if (fs.existsSync(tokensSrc)) {
      fs.copyFileSync(tokensSrc, path.join(tideDir, "tokens.json"));
    }
  }

  if (options.verbose) {
    console.log(formatScanDiagnostics(diagnostics));
  }

  return { manifest, props, storiesPath, diagnostics };
}

interface StoriesFileOptions {
  /** Per-CSF-id literal args, used as the story entry's `args`. */
  csfArgs: Record<string, Record<string, unknown>>;
  /** Project-relative path to `.storybook/preview.*`, if any. */
  previewPath: string | null;
}

function relImportTo(tideDirAbs: string, root: string, relPath: string): string {
  const rel = path.relative(tideDirAbs, path.join(root, relPath)).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function generateStoriesFile(
  root: string,
  manifest: Manifest,
  props: PropsMap,
  config: TideConfig,
  options: StoriesFileOptions,
): string {
  const lines: string[] = ["// Auto-generated by Tide — do not edit", ""];

  const imports: string[] = [];
  const storyEntries: string[] = [];

  const tideDirAbs = path.join(root, ".tide");
  let wrapperExport = "export const previewWrapper = null;";
  const wrapper = config.preview?.wrapper;
  if (wrapper) {
    const abs = path.isAbsolute(wrapper) ? wrapper : path.join(root, wrapper);
    const rel = path.relative(tideDirAbs, abs).replace(/\\/g, "/");
    const importPath = rel.startsWith(".") ? rel : `./${rel}`;
    imports.push(`import __previewWrapper from ${JSON.stringify(importPath)};`);
    wrapperExport = "export const previewWrapper = __previewWrapper;";
  }

  // CSF story rendering + control hydration lives in @tide/storybook.
  const hasCsf = manifest.components.some((c) => c.source === "csf");
  const previewImport = options.previewPath
    ? relImportTo(tideDirAbs, root, options.previewPath)
    : null;
  const { lines: csfLines, projectAnnotations } = csfPreamble({
    hasCsf,
    previewImportPath: previewImport,
  });
  imports.push(...csfLines);

  for (const component of manifest.components) {
    const componentId = getComponentId(component);

    if (component.source === "csf") {
      const args = options.csfArgs[componentId] ?? {};
      storyEntries.push(
        csfStoryEntry({
          componentId,
          storyImportPath: relImportTo(tideDirAbs, root, component.storyFile ?? component.path),
          exportName: component.storyExport ?? component.exportName,
          argsJson: JSON.stringify(args, null, 2).split("\n").join("\n    "),
          title: component.title,
          name: component.name,
          path: component.storyFile ?? component.path,
          projectAnnotations,
        }),
      );
      continue;
    }

    const importPath = relImportTo(tideDirAbs, root, component.path);
    const componentProps = props[componentId] ?? {};
    const args = buildDefaultArgs(componentProps, config.defaults?.[componentId]);
    const argsJson = JSON.stringify(args, null, 2).split("\n").join("\n    ");

    const exportKey = component.isDefault ? "default" : component.exportName;
    storyEntries.push(`  ${JSON.stringify(componentId)}: {
    load: () => import(${JSON.stringify(importPath)}),
    exportName: ${JSON.stringify(exportKey)},
    isDefault: ${component.isDefault ?? false},
    args: ${argsJson},
    title: ${JSON.stringify(component.title)},
    path: ${JSON.stringify(component.path)},
    name: ${JSON.stringify(component.name)},
  }`);
  }

  lines.push(...imports);
  lines.push("");
  lines.push("export const stories = {");
  lines.push(storyEntries.join(",\n"));
  lines.push("};");
  lines.push("");
  lines.push(wrapperExport);
  lines.push("");
  lines.push("export type StoryName = keyof typeof stories;");

  return lines.join("\n");
}

export { discoverComponents } from "./discover.js";
export { extractProps } from "./extract-props.js";
// Re-export Storybook helpers so existing importers (e.g. the CLI) keep working.
export {
  discoverStories,
  hasStorybook,
  locateStorybook,
  resolveStorybookOptions,
  storybookPreviewVite,
  DEFAULT_STORY_GLOBS,
  type StorybookLocation,
  type DiscoverStoriesResult,
} from "@tide/storybook";
export {
  buildScanDiagnostics,
  formatScanDiagnostics,
  type ScanDiagnostics,
} from "./diagnostics.js";
