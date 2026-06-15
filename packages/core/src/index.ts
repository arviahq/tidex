import path from "node:path";
import type { InlineConfig } from "vite";

export interface TideConfig {
  root: string;
  scan: {
    include: string[];
    exclude?: string[];
    /** Folder segment used for sidebar grouping, e.g. `src/components` or `src/ui`. */
    componentsDir?: string;
  };
  /** npm package name shown in generated import examples, e.g. `@myorg/ui`. */
  packageName?: string;
  /** Per-component default arg overrides, keyed by component id. */
  defaults?: Record<string, Record<string, unknown>>;
  tokens?: string;
  plugins?: TidePlugin[];
  managerPort?: number;
  previewPort?: number;
  visual?: { threshold?: number };
  /**
   * Preview rendering options.
   * - `wrapper`: path (relative to the project root) to a module whose default
   *   export is a React component taking `children`; every rendered component is
   *   wrapped in it (e.g. a theme/ChakraProvider/i18n provider).
   * - `vite`: extra Vite config merged into the preview/visual/test servers.
   *   Use it to add build plugins your components need (e.g. vanilla-extract,
   *   svgr). Tide already provides React, so add only the extra plugins.
   */
  preview?: { wrapper?: string; vite?: InlineConfig };
  /**
   * Ingest an existing Storybook. When a project has a `.storybook/` config (or
   * any `*.stories.*` files), Tide reads each Component Story Format (CSF) story
   * and surfaces it alongside (or instead of) its convention-scanned components.
   * Stories render at full fidelity via Storybook's portable-stories
   * `composeStory`, so meta/story/global decorators and `.storybook/preview`
   * globals all apply.
   * - `enabled`: force on/off. Unset = auto-detect (`.storybook/main.*` or any
   *   `*.stories.*` present).
   * - `configDir`: Storybook config directory (default `.storybook`).
   * - `stories`: override the story globs (relative to the project root). When
   *   unset, Tide reads them from `<configDir>/main.*`, falling back to
   *   `**\/*.stories.@(tsx|ts|jsx|js)`.
   */
  storybook?: {
    enabled?: boolean;
    configDir?: string;
    stories?: string[];
    /**
     * When a Storybook is ingested, also run Tide's convention `.tsx` scan and
     * show those components alongside the stories. Default `false` — a Storybook
     * project's sidebar mirrors Storybook (stories only), avoiding duplicate
     * entries for every component that also has a story.
     */
    scan?: boolean;
    /**
     * Reuse the project's own `vite.config.*` plugins (e.g. vanilla-extract,
     * svgr) in Tide's preview/visual/test servers, so stories render with the
     * same build pipeline Storybook uses. Default `true` when a Storybook is
     * detected. Build-only/conflicting plugins (dts, the React plugin Tide
     * already provides) are filtered out. Set `false` to opt out.
     */
    viteConfig?: boolean;
  };
}

/**
 * Globs always excluded from component discovery, on top of any user
 * `scan.exclude`. Keeps Storybook stories and test files from being scanned as
 * components (e.g. CSF2 `export const Primary = () => <Button/>` would
 * otherwise be picked up as a component named "Primary").
 */
export const DEFAULT_SCAN_EXCLUDE = [
  "**/node_modules/**",
  "**/*.stories.*",
  "**/*.story.*",
  "**/*.test.*",
  "**/*.spec.*",
  "**/*.d.ts",
];

export interface TidePlugin {
  name: string;
  setup(ctx: TideContext): void;
}

export interface PanelConfig {
  id: string;
  title: string;
  component: string;
}

export interface TideContext {
  addPanel(config: PanelConfig): void;
  onGenerate(hook: () => void | Promise<void>): void;
  getPanels(): PanelConfig[];
  runGenerateHooks(): Promise<void>;
}

export interface ComponentEntry {
  /** Stable id for stories, props, tests, and baselines (e.g. `forms/Checkbox`). */
  id: string;
  name: string;
  path: string;
  exportName: string;
  title: string;
  isDefault?: boolean;
  /**
   * How this entry was discovered. `"scan"` (default/omitted) = a convention
   * component parsed from a `.tsx` file. `"csf"` = one named story from a
   * Storybook CSF file; `storyExport`/`storyFile` drive `composeStory` codegen.
   */
  source?: "scan" | "csf";
  /** CSF only: the story's named export (e.g. `Primary`). */
  storyExport?: string;
  /** CSF only: project-relative path to the `*.stories.*` file. */
  storyFile?: string;
}

/** Resolve the stable component id; falls back to `name` for older manifests. */
export function getComponentId(entry: Pick<ComponentEntry, "id" | "name">): string {
  return entry.id || entry.name;
}

export function isValidComponentId(id: string): boolean {
  if (!id || id.includes("..")) return false;
  return /^[A-Za-z0-9_./-]+$/.test(id);
}

/**
 * Turn an arbitrary label (e.g. a Storybook `title` plus a story name) into a
 * component id that satisfies {@link isValidComponentId}: collapse whitespace
 * and any other unsupported character to `-`, keep slashes as folder
 * separators, and trim stray separators. `"Forms/Primary Button" + "On Hover"`
 * → `"Forms/Primary-Button/On-Hover"`.
 */
export function sanitizeComponentId(raw: string): string {
  return raw
    .split("/")
    .map((seg) =>
      seg
        .trim()
        .replace(/[^A-Za-z0-9_.-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("/");
}

export interface Manifest {
  components: ComponentEntry[];
}

export type PropSchema =
  | { type: "boolean"; required?: boolean; description?: string }
  | { type: "string"; required?: boolean; description?: string }
  | { type: "number"; required?: boolean; description?: string }
  | { type: "union"; values: string[]; required?: boolean; description?: string }
  | {
      type: "object";
      properties: Record<string, PropSchema>;
      required?: boolean;
      description?: string;
    }
  | { type: "callback"; required?: boolean; description?: string }
  | { type: "unknown"; required?: boolean; description?: string };

export type PropsMap = Record<string, Record<string, PropSchema>>;

/**
 * Persisted callback→state wiring for a component, authored in the manager's
 * Interactions tab and stored at `.tide/interactions/<Component>.json`. A
 * callback mapped with `updates` re-renders the preview with the new value; an
 * empty `{}` means action-only (wired to a no-op). Wiring is fully explicit —
 * nothing is inferred from callback names.
 */
export interface InteractionWiring {
  component: string;
  callbacks: Record<string, { updates?: string }>;
}

export interface StoryEntry {
  componentPath: string;
  exportName: string;
  isDefault: boolean;
  args: Record<string, unknown>;
  title: string;
}

export type StoriesMap = Record<string, StoryEntry>;

/** How an interaction step locates an element inside the rendered component. */
export interface StepTarget {
  by: "role" | "text" | "testid" | "css";
  value: string;
  /** Accessible name, used to disambiguate `role` queries. */
  name?: string;
}

export type AssertMatcher = "exists" | "absent" | "text" | "value" | "checked" | "disabled";

/** A single no-code interaction step authored in the Tests panel. */
export type InteractionStep =
  | { type: "click"; target: StepTarget }
  | { type: "type"; target: StepTarget; value: string }
  | { type: "wait"; ms: number }
  | { type: "assert"; target: StepTarget; matcher: AssertMatcher; expected?: string | boolean };

export interface InteractionTest {
  component: string;
  /** Props to mount the component with; defaults to the story's default args. */
  args?: Record<string, unknown>;
  steps: InteractionStep[];
}

/** Outcome of running one {@link InteractionStep}. */
export interface StepResult {
  index: number;
  ok: boolean;
  message?: string;
}

export const TIDE_DIR = ".tide";

export function formatDisplayName(name: string): string {
  if (!name) return name;

  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

export function getTideDir(root: string): string {
  return path.join(root, TIDE_DIR);
}

export function getManifestPath(root: string): string {
  return path.join(getTideDir(root), "manifest.json");
}

export function getPropsPath(root: string): string {
  return path.join(getTideDir(root), "props.json");
}

export function getStoriesPath(root: string): string {
  return path.join(getTideDir(root), "stories.generated.ts");
}

export function getReportsDir(root: string): string {
  return path.join(getTideDir(root), "reports");
}

export function getBaselinesDir(root: string): string {
  return path.join(getTideDir(root), "baselines");
}

/** Committed multi-layer snapshot stored alongside the baseline PNG. */
export function getBaselineSnapshotPath(root: string, componentId: string): string {
  return path.join(getBaselinesDir(root), `${componentId}.snapshot.json`);
}

/** Gitignored current-run snapshot stored alongside the current PNG. */
export function getCurrentSnapshotPath(root: string, componentId: string): string {
  return path.join(getReportsDir(root), `${componentId}-current.snapshot.json`);
}

export function getTestsDir(root: string): string {
  return path.join(getTideDir(root), "tests");
}

export function getTestPath(root: string, componentId: string): string {
  return path.join(getTestsDir(root), `${componentId}.json`);
}

export function getConfigSnapshotPath(root: string): string {
  return path.join(getTideDir(root), "config.json");
}

export function getScanReportPath(root: string): string {
  return path.join(getTideDir(root), "scan-report.json");
}

export function getInteractionsDir(root: string): string {
  return path.join(getTideDir(root), "interactions");
}

export function getInteractionPath(root: string, componentId: string): string {
  return path.join(getInteractionsDir(root), `${componentId}.json`);
}

export function defaultConfig(root: string): TideConfig {
  return {
    root,
    scan: {
      include: ["src/**/*.tsx"],
      exclude: ["**/preview/**"],
      componentsDir: "src/components",
    },
    managerPort: 6006,
    previewPort: 6007,
  };
}

export function defineConfig(config: Partial<TideConfig> & { root?: string }): TideConfig {
  const root = config.root ?? process.cwd();
  const base = defaultConfig(root);
  return { ...base, ...config, root, scan: { ...base.scan, ...config.scan } };
}

export interface PluginContext extends TideContext {}

export function createPluginContext(): PluginContext {
  const panels: PanelConfig[] = [];
  const generateHooks: Array<() => void | Promise<void>> = [];

  return {
    addPanel(config: PanelConfig) {
      panels.push(config);
    },
    onGenerate(hook: () => void | Promise<void>) {
      generateHooks.push(hook);
    },
    getPanels() {
      return panels;
    },
    async runGenerateHooks() {
      for (const hook of generateHooks) {
        await hook();
      }
    },
  };
}

export function applyPlugins(config: TideConfig): PluginContext {
  const ctx = createPluginContext();
  for (const plugin of config.plugins ?? []) {
    plugin.setup(ctx);
  }
  return ctx;
}

function defaultStringValue(propName?: string): string {
  if (!propName) return "Example";
  const key = propName.toLowerCase();
  if (key.includes("name")) return "Jane Cooper";
  if (key === "title") return "Welcome back";
  if (key.includes("label")) return "Monthly revenue";
  if (key === "value") return "$12,480";
  if (key === "change") return "+12.4%";
  if (key === "role") return "Product Designer";
  if (key.includes("description") || key === "message") {
    return "Review the latest updates and confirm your settings.";
  }
  if (key.includes("placeholder")) return "Search components…";
  if (key.includes("confirm")) return "Continue";
  if (key.includes("url") || key.includes("image")) return "";
  return "Example";
}

export function defaultArgsForProp(schema: PropSchema, propName?: string): unknown {
  switch (schema.type) {
    case "boolean":
      return false;
    case "string":
      return defaultStringValue(propName);
    case "number":
      return 0;
    case "union":
      return schema.values[0] ?? "";
    case "object": {
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = defaultArgsForProp(prop, key);
      }
      return obj;
    }
    default:
      return undefined;
  }
}

export function buildDefaultArgs(
  props: Record<string, PropSchema>,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(props)) {
    if (schema.type === "unknown" || schema.type === "callback") continue;
    args[name] = defaultArgsForProp(schema, name);
  }
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (key in props) args[key] = value;
    }
  }
  return args;
}

export const SKIP_PROP_PATTERNS = [
  /^children$/,
  /^className$/,
  /^style$/,
  /^ref$/,
  /^key$/,
  /ReactNode/,
  /ReactElement/,
  /ElementType/,
  /HTMLAttributes/,
  /\.\.\./,
];

// A prop is a callback (function) if its name looks like an event handler or
// its type is a function. Callbacks aren't controllable props; they surface in
// the Interactions tab where the author maps each to the state prop it updates.
export function isCallbackProp(name: string, typeText?: string): boolean {
  if (/^on[A-Z]/.test(name)) return true;
  if (typeText && /=>\s*/.test(typeText)) return true;
  return false;
}

export function shouldSkipProp(name: string, typeText?: string): boolean {
  if (isCallbackProp(name, typeText)) return false;
  if (SKIP_PROP_PATTERNS.some((p) => p.test(name))) return true;
  if (typeText && SKIP_PROP_PATTERNS.some((p) => p.test(typeText))) return true;
  if (typeText && /=>\s*/.test(typeText)) return true;
  return false;
}

import fs from "node:fs";
import type { Plugin } from "vite";

export interface TideVitePluginOptions {
  root: string;
  tideDir: string;
}

export function tideVitePlugin(options: TideVitePluginOptions): Plugin {
  const virtualStoriesId = "virtual:tide-stories";
  const resolvedVirtualStoriesId = "\0" + virtualStoriesId;

  return {
    name: "tide",
    resolveId(id) {
      if (id === virtualStoriesId) return resolvedVirtualStoriesId;
      return null;
    },
    load(id) {
      if (id === resolvedVirtualStoriesId) {
        const storiesPath = path.join(options.tideDir, "stories.generated.ts");
        return `export * from ${JSON.stringify(storiesPath)};`;
      }
      return null;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        if (!url.startsWith("/__tide/")) {
          next();
          return;
        }

        // Save an interaction test to .tide/tests/<Component>.json.
        if (url === "/__tide/tests" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body) as { component?: string; test?: unknown };
              const component = parsed.component ?? "";
              if (!isValidComponentId(component)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: "Invalid component id" }));
                return;
              }
              fs.mkdirSync(path.dirname(getTestPath(options.root, component)), {
                recursive: true,
              });
              fs.writeFileSync(
                getTestPath(options.root, component),
                JSON.stringify(parsed.test ?? {}, null, 2),
              );
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }

        // Save callback→state wiring to .tide/interactions/<Component>.json.
        if (url === "/__tide/interactions" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body) as { component?: string; wiring?: unknown };
              const component = parsed.component ?? "";
              if (!isValidComponentId(component)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: "Invalid component id" }));
                return;
              }
              fs.mkdirSync(path.dirname(getInteractionPath(options.root, component)), {
                recursive: true,
              });
              fs.writeFileSync(
                getInteractionPath(options.root, component),
                JSON.stringify(parsed.wiring ?? {}, null, 2),
              );
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }

        // List components that have a saved interaction test.
        if (url === "/__tide/tests" && req.method === "GET") {
          const testsDir = getTestsDir(options.root);
          const names: string[] = [];
          const walk = (dir: string, prefix = "") => {
            if (!fs.existsSync(dir)) return;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
              const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
              if (entry.isDirectory()) {
                walk(path.join(dir, entry.name), rel);
              } else if (entry.name.endsWith(".json")) {
                names.push(rel.replace(/\.json$/, ""));
              }
            }
          };
          walk(testsDir);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(names));
          return;
        }

        // Otherwise serve a static artifact from the .tide directory.
        const file = decodeURIComponent(url.replace("/__tide/", ""));
        if (file.includes("..")) {
          res.statusCode = 400;
          res.end();
          return;
        }
        const filePath = path.join(options.tideDir, file);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // Artifacts (baselines, current/diff captures, generated JSON) are
          // rewritten in place during a dev session — never let the browser
          // serve a stale copy.
          res.setHeader("Cache-Control", "no-store");
          if (file.endsWith(".png")) {
            res.setHeader("Content-Type", "image/png");
            if (req.method === "HEAD") {
              res.statusCode = 200;
              res.end();
              return;
            }
            res.end(fs.readFileSync(filePath));
            return;
          }
          if (req.method === "HEAD") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end();
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(fs.readFileSync(filePath, "utf-8"));
          return;
        }

        next();
      });
    },
  };
}
