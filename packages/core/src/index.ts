import path from "node:path";

export interface TideConfig {
  root: string;
  scan: { include: string[]; exclude?: string[] };
  tokens?: string;
  plugins?: TidePlugin[];
  managerPort?: number;
  previewPort?: number;
  visual?: { threshold?: number };
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
  name: string;
  path: string;
  exportName: string;
  title: string;
  isDefault?: boolean;
}

export interface Manifest {
  components: ComponentEntry[];
}

export type PropSchema =
  | { type: "boolean"; required?: boolean }
  | { type: "string"; required?: boolean }
  | { type: "number"; required?: boolean }
  | { type: "union"; values: string[]; required?: boolean }
  | { type: "object"; properties: Record<string, PropSchema>; required?: boolean }
  | { type: "callback"; required?: boolean }
  | { type: "unknown"; required?: boolean };

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

export function getTestsDir(root: string): string {
  return path.join(getTideDir(root), "tests");
}

export function getTestPath(root: string, component: string): string {
  return path.join(getTestsDir(root), `${component}.json`);
}

export function getInteractionsDir(root: string): string {
  return path.join(getTideDir(root), "interactions");
}

export function getInteractionPath(root: string, component: string): string {
  return path.join(getInteractionsDir(root), `${component}.json`);
}

export function defaultConfig(root: string): TideConfig {
  return {
    root,
    scan: { include: ["src/**/*.tsx"] },
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

export function buildDefaultArgs(props: Record<string, PropSchema>): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(props)) {
    if (schema.type === "unknown" || schema.type === "callback") continue;
    args[name] = defaultArgsForProp(schema, name);
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
              if (!/^[A-Za-z0-9_-]+$/.test(component)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: "Invalid component name" }));
                return;
              }
              fs.mkdirSync(getTestsDir(options.root), { recursive: true });
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
              if (!/^[A-Za-z0-9_-]+$/.test(component)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: "Invalid component name" }));
                return;
              }
              fs.mkdirSync(getInteractionsDir(options.root), { recursive: true });
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
          const names = fs.existsSync(testsDir)
            ? fs
                .readdirSync(testsDir)
                .filter((f) => f.endsWith(".json"))
                .map((f) => f.replace(/\.json$/, ""))
            : [];
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(names));
          return;
        }

        // Otherwise serve a static artifact from the .tide directory.
        const file = url.replace("/__tide/", "");
        const filePath = path.join(options.tideDir, file);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
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
