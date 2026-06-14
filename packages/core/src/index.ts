import path from "node:path";

export interface TideConfig {
  root: string;
  scan: { include: string[] };
  tokens?: string;
  plugins?: TidePlugin[];
  managerPort?: number;
  previewPort?: number;
}

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
  | { type: "unknown"; required?: boolean };

export type PropsMap = Record<string, Record<string, PropSchema>>;

export interface StoryEntry {
  componentPath: string;
  exportName: string;
  isDefault: boolean;
  args: Record<string, unknown>;
  title: string;
}

export type StoriesMap = Record<string, StoryEntry>;

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
  return { ...defaultConfig(root), ...config, root };
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
    if (schema.type === "unknown") continue;
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
  /^on[A-Z]/,
  /ReactNode/,
  /ReactElement/,
  /ElementType/,
  /HTMLAttributes/,
  /=>\s*/,
  /\.\.\./,
];

export function shouldSkipProp(name: string, typeText?: string): boolean {
  if (SKIP_PROP_PATTERNS.some((p) => p.test(name))) return true;
  if (typeText && SKIP_PROP_PATTERNS.some((p) => p.test(typeText))) return true;
  return false;
}

import fs from "node:fs";
import type { Plugin } from "vite";

export function tideVitePlugin(options: { root: string; tideDir: string }): Plugin {
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
        const url = req.url ?? "";
        if (url.startsWith("/__tide/")) {
          const file = url.replace("/__tide/", "");
          const filePath = path.join(options.tideDir, file);
          if (fs.existsSync(filePath)) {
            res.setHeader("Content-Type", "application/json");
            res.end(fs.readFileSync(filePath, "utf-8"));
            return;
          }
        }
        next();
      });
    },
  };
}
