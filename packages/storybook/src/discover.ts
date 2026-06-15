import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import {
  Node,
  Project,
  type ObjectLiteralExpression,
  type SourceFile,
  type Expression,
} from "ts-morph";
import {
  isCallbackProp,
  sanitizeComponentId,
  type ComponentEntry,
  type PropSchema,
  type PropsMap,
  type TideConfig,
} from "@tide/core";

export const DEFAULT_STORY_GLOBS = ["**/*.stories.@(tsx|ts|jsx|js)"];
const DEFAULT_CONFIG_DIR = ".storybook";

export interface ResolvedStorybookOptions {
  enabled: boolean;
  configDir: string;
  stories?: string[];
  scan: boolean;
  viteConfig: boolean;
}

/** Resolve the effective Storybook ingestion options, applying auto-detection. */
export function resolveStorybookOptions(config: TideConfig): ResolvedStorybookOptions {
  const sb = config.storybook;
  const configDir = sb?.configDir ?? DEFAULT_CONFIG_DIR;
  const enabled = sb?.enabled ?? hasStorybook(config.root, configDir);
  return {
    enabled,
    configDir,
    stories: sb?.stories,
    scan: sb?.scan ?? false,
    viteConfig: sb?.viteConfig ?? true,
  };
}
// Storybook indexer convention: non-story named exports never start as stories.
const NON_STORY_EXPORTS = new Set(["__namedExportsOrder", "default"]);

export interface StorybookLocation {
  /** Story globs, project-root-relative, ready for fast-glob (cwd = root). */
  storyGlobs: string[];
  /** Project-relative path to `<configDir>/preview.*`, or null when absent. */
  previewPath: string | null;
  /** Whether a real `.storybook/` config dir was found (vs. globbing only). */
  hasConfigDir: boolean;
}

export interface DiscoverStoriesResult {
  components: ComponentEntry[];
  props: PropsMap;
  /**
   * Per-story id → the story's literal arg values (meta.args merged with the
   * story's own args). Seeds the manager's controls and the story entry's
   * `args` so render paths match what Storybook would show. Non-literal args
   * (JSX, function refs) are omitted — `composeStory` bakes those at runtime.
   */
  defaults: Record<string, Record<string, unknown>>;
  previewPath: string | null;
}

/** True when a project looks like it has a Storybook to ingest. */
export function hasStorybook(root: string, configDir = DEFAULT_CONFIG_DIR): boolean {
  const dir = path.join(root, configDir);
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return true;
  const stories = fg.sync(DEFAULT_STORY_GLOBS, {
    cwd: root,
    ignore: ["**/node_modules/**"],
    absolute: false,
  });
  return stories.length > 0;
}

/**
 * Resolve where the stories live and whether there's a preview module. Reads
 * `<configDir>/main.*` for its `stories` globs when present (Storybook globs are
 * relative to the config dir, so they're rebased onto the project root);
 * otherwise falls back to {@link DEFAULT_STORY_GLOBS}.
 */
export function locateStorybook(
  root: string,
  options: { configDir?: string; stories?: string[] } = {},
): StorybookLocation {
  const configDir = options.configDir ?? DEFAULT_CONFIG_DIR;
  const configDirAbs = path.join(root, configDir);
  const hasConfigDir = fs.existsSync(configDirAbs) && fs.statSync(configDirAbs).isDirectory();

  let storyGlobs = options.stories;
  if (!storyGlobs && hasConfigDir) {
    const mainGlobs = readMainStoryGlobs(configDirAbs);
    if (mainGlobs && mainGlobs.length > 0) {
      // Rebase config-dir-relative globs (e.g. "../src/**/*.stories.tsx") onto
      // the project root so fast-glob can run with cwd = root.
      storyGlobs = mainGlobs.map((g) => rebaseGlob(g, configDirAbs, root));
    }
  }
  storyGlobs ??= DEFAULT_STORY_GLOBS;

  let previewPath: string | null = null;
  if (hasConfigDir) {
    for (const ext of ["ts", "tsx", "js", "jsx", "mjs"]) {
      const candidate = path.join(configDirAbs, `preview.${ext}`);
      if (fs.existsSync(candidate)) {
        previewPath = path.relative(root, candidate).replace(/\\/g, "/");
        break;
      }
    }
  }

  return { storyGlobs, previewPath, hasConfigDir };
}

function rebaseGlob(glob: string, fromDir: string, root: string): string {
  if (path.isAbsolute(glob)) return path.relative(root, glob).replace(/\\/g, "/");
  const abs = path.resolve(fromDir, glob);
  return path.relative(root, abs).replace(/\\/g, "/");
}

/** Statically read the `stories` array from `<configDir>/main.*`. */
function readMainStoryGlobs(configDirAbs: string): string[] | null {
  let mainPath: string | null = null;
  for (const ext of ["ts", "js", "mjs", "cjs", "tsx"]) {
    const candidate = path.join(configDirAbs, `main.${ext}`);
    if (fs.existsSync(candidate)) {
      mainPath = candidate;
      break;
    }
  }
  if (!mainPath) return null;

  try {
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      useInMemoryFileSystem: false,
    });
    const sf = project.addSourceFileAtPath(mainPath);
    const config = getDefaultExportObject(sf);
    const storiesProp = config?.getProperty("stories");
    if (!storiesProp || !Node.isPropertyAssignment(storiesProp)) return null;
    const init = storiesProp.getInitializer();
    if (!init || !Node.isArrayLiteralExpression(init)) return null;

    const globs: string[] = [];
    for (const el of init.getElements()) {
      if (Node.isStringLiteral(el)) {
        globs.push(el.getLiteralValue());
      } else if (Node.isObjectLiteralExpression(el)) {
        // { directory, files } form.
        const directory = getStringProp(el, "directory") ?? ".";
        const filesPart = getStringProp(el, "files") ?? "**/*.stories.@(tsx|ts|jsx|js)";
        globs.push(`${directory.replace(/\/$/, "")}/${filesPart}`);
      }
    }
    return globs.length > 0 ? globs : null;
  } catch {
    return null;
  }
}

/**
 * Discover every CSF story under the project and turn each into a
 * {@link ComponentEntry} (one entry per story) plus a best-effort prop schema
 * for the controls panel.
 */
export function discoverStories(
  root: string,
  options: { configDir?: string; stories?: string[]; ignore?: string[] } = {},
): DiscoverStoriesResult {
  const { storyGlobs, previewPath } = locateStorybook(root, options);
  const ignore = ["**/node_modules/**", "**/*.mdx", ...(options.ignore ?? [])];
  const files = fg.sync(storyGlobs, { cwd: root, ignore, absolute: false });

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { jsx: 2 },
  });

  const components: ComponentEntry[] = [];
  const props: PropsMap = {};
  const defaults: Record<string, Record<string, unknown>> = {};
  const seen = new Set<string>();

  for (const file of files) {
    const absPath = path.join(root, file);
    let sf: SourceFile;
    try {
      sf = project.addSourceFileAtPath(absPath);
    } catch {
      continue;
    }
    parseCsfFile(sf, file, components, props, defaults, seen);
  }

  components.sort((a, b) => a.id.localeCompare(b.id));
  return { components, props, defaults, previewPath };
}

function parseCsfFile(
  sf: SourceFile,
  relPath: string,
  components: ComponentEntry[],
  props: PropsMap,
  defaults: Record<string, Record<string, unknown>>,
  seen: Set<string>,
): void {
  const meta = getDefaultExportObject(sf);
  if (!meta) return; // No default export → not a CSF file we understand.

  const title = getStringProp(meta, "title") ?? deriveStoryTitle(relPath);
  const include = getStringArrayProp(meta, "includeStories");
  const exclude = getStringArrayProp(meta, "excludeStories");
  const metaArgs = getObjectProp(meta, "args");
  const metaArgTypes = getObjectProp(meta, "argTypes");

  const order = getStringArrayProp(sf, "__namedExportsOrder") ?? getNamedExportsOrder(sf);
  const storyExports = collectStoryExports(sf);

  const orderedNames = order
    ? order.filter((n) => storyExports.has(n))
    : Array.from(storyExports.keys());

  for (const exportName of orderedNames) {
    if (NON_STORY_EXPORTS.has(exportName)) continue;
    if (include && !include.includes(exportName)) continue;
    if (exclude && exclude.includes(exportName)) continue;

    const storyObj = storyExports.get(exportName);
    const displayName = (storyObj && getStringProp(storyObj, "name")) ?? exportName;

    const id = sanitizeComponentId(`${title}/${displayName}`);
    if (!id) continue;
    const key = `${relPath}:${exportName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    components.push({
      id,
      name: displayName,
      path: relPath,
      exportName,
      title: `${title}/${displayName}`,
      source: "csf",
      storyExport: exportName,
      storyFile: relPath,
    });

    const storyArgs = storyObj ? getObjectProp(storyObj, "args") : undefined;
    props[id] = buildPropsForStory(metaArgs, storyArgs, metaArgTypes);
    const argValues = extractArgValues(metaArgs, storyArgs);
    if (Object.keys(argValues).length > 0) defaults[id] = argValues;
  }
}

/** Literal arg values from meta.args + story.args (story wins). Non-literals dropped. */
function extractArgValues(
  metaArgs: ObjectLiteralExpression | undefined,
  storyArgs: ObjectLiteralExpression | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const argsObj of [metaArgs, storyArgs]) {
    if (!argsObj) continue;
    for (const prop of argsObj.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;
      const name = prop.getName().replace(/^["']|["']$/g, "");
      const init = prop.getInitializer();
      if (!init || isCallbackValue(name, init)) {
        delete out[name];
        continue;
      }
      const lit = literalValue(init);
      if (lit.ok) out[name] = lit.value;
    }
  }
  return out;
}

function literalValue(expr: Expression): { ok: true; value: unknown } | { ok: false } {
  if (Node.isStringLiteral(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
    return { ok: true, value: expr.getLiteralValue() };
  }
  if (Node.isNumericLiteral(expr)) return { ok: true, value: Number(expr.getLiteralValue()) };
  if (Node.isTrueLiteral(expr)) return { ok: true, value: true };
  if (Node.isFalseLiteral(expr)) return { ok: true, value: false };
  if (expr.getKind() === 106) return { ok: true, value: null }; // NullKeyword
  if (Node.isPrefixUnaryExpression(expr)) {
    const operand = expr.getOperand();
    if (Node.isNumericLiteral(operand)) {
      return { ok: true, value: -Number(operand.getLiteralValue()) };
    }
    return { ok: false };
  }
  if (Node.isArrayLiteralExpression(expr)) {
    const arr: unknown[] = [];
    for (const el of expr.getElements()) {
      const v = literalValue(el);
      if (!v.ok) return { ok: false };
      arr.push(v.value);
    }
    return { ok: true, value: arr };
  }
  if (Node.isObjectLiteralExpression(expr)) {
    const obj: Record<string, unknown> = {};
    for (const prop of expr.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) return { ok: false };
      const init = prop.getInitializer();
      if (!init) return { ok: false };
      const v = literalValue(init);
      if (!v.ok) return { ok: false };
      obj[prop.getName().replace(/^["']|["']$/g, "")] = v.value;
    }
    return { ok: true, value: obj };
  }
  return { ok: false };
}

/**
 * Exported story candidates, keyed by export name. A CSF story export is an
 * object (CSF3), a function, or a call like `Template.bind({})` / an identifier
 * referencing one (CSF2) — never a plain primitive/array literal (those are
 * helper exports, e.g. `export const ROWS = 10`). The map value is the story's
 * object literal when present (used to read per-story `name`/`args`), else null.
 */
function collectStoryExports(sf: SourceFile): Map<string, ObjectLiteralExpression | null> {
  const map = new Map<string, ObjectLiteralExpression | null>();

  for (const stmt of sf.getVariableStatements()) {
    if (!stmt.isExported()) continue;
    for (const decl of stmt.getDeclarations()) {
      const name = decl.getName();
      if (NON_STORY_EXPORTS.has(name)) continue;
      const init = decl.getInitializer();
      if (!init) continue;
      if (Node.isObjectLiteralExpression(init)) {
        map.set(name, init);
      } else if (
        Node.isArrowFunction(init) ||
        Node.isFunctionExpression(init) ||
        Node.isCallExpression(init) ||
        Node.isIdentifier(init)
      ) {
        map.set(name, null);
      }
      // Primitive/array/other literal initializers are helpers — skip.
    }
  }

  for (const fn of sf.getFunctions()) {
    if (!fn.isExported() || fn.isDefaultExport()) continue;
    const name = fn.getName();
    if (!name || NON_STORY_EXPORTS.has(name)) continue;
    map.set(name, null);
  }

  return map;
}

// ---- prop schema (controls) ------------------------------------------------

function buildPropsForStory(
  metaArgs: ObjectLiteralExpression | undefined,
  storyArgs: ObjectLiteralExpression | undefined,
  argTypes: ObjectLiteralExpression | undefined,
): Record<string, PropSchema> {
  const schema: Record<string, PropSchema> = {};

  // argTypes give the richest control hints (select options, explicit types).
  if (argTypes) {
    for (const prop of argTypes.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;
      const name = prop.getName().replace(/^["']|["']$/g, "");
      const value = prop.getInitializer();
      if (!value || !Node.isObjectLiteralExpression(value)) continue;
      const s = schemaFromArgType(value);
      if (s) schema[name] = s;
    }
  }

  // Fill in (and skip callbacks) from concrete arg values.
  for (const argsObj of [metaArgs, storyArgs]) {
    if (!argsObj) continue;
    for (const prop of argsObj.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;
      const name = prop.getName().replace(/^["']|["']$/g, "");
      const value = prop.getInitializer();
      if (!value) continue;
      if (isCallbackValue(name, value)) {
        delete schema[name];
        continue;
      }
      if (schema[name]) continue; // argTypes already described it.
      const s = schemaFromArgValue(value);
      if (s) schema[name] = s;
    }
  }

  return schema;
}

function schemaFromArgType(obj: ObjectLiteralExpression): PropSchema | null {
  const controlProp = obj.getProperty("control");
  let controlType: string | undefined;
  if (controlProp && Node.isPropertyAssignment(controlProp)) {
    const init = controlProp.getInitializer();
    if (init && Node.isStringLiteral(init)) {
      controlType = init.getLiteralValue();
    } else if (init && Node.isObjectLiteralExpression(init)) {
      controlType = getStringProp(init, "type");
    }
  }

  const options = getStringArrayProp(obj, "options");
  if (options && options.length > 0) return { type: "union", values: options };

  switch (controlType) {
    case "boolean":
      return { type: "boolean" };
    case "text":
    case "color":
    case "date":
      return { type: "string" };
    case "number":
    case "range":
      return { type: "number" };
    case "select":
    case "radio":
    case "inline-radio":
    case "check":
    case "inline-check":
      return options ? { type: "union", values: options } : null;
    default:
      return null;
  }
}

function schemaFromArgValue(value: Expression): PropSchema | null {
  if (Node.isTrueLiteral(value) || Node.isFalseLiteral(value)) return { type: "boolean" };
  if (Node.isNumericLiteral(value)) return { type: "number" };
  if (Node.isStringLiteral(value) || Node.isNoSubstitutionTemplateLiteral(value)) {
    return { type: "string" };
  }
  return null;
}

function isCallbackValue(name: string, value: Expression): boolean {
  if (isCallbackProp(name)) return true;
  return Node.isArrowFunction(value) || Node.isFunctionExpression(value);
}

// ---- shared ts-morph helpers -----------------------------------------------

/** Resolve the default-exported object literal (`export default {...}` or
 * `const meta = {...}; export default meta`, with optional `satisfies`/`as`). */
function getDefaultExportObject(sf: SourceFile): ObjectLiteralExpression | undefined {
  for (const ea of sf.getExportAssignments()) {
    if (ea.isExportEquals()) continue;
    return unwrapToObject(ea.getExpression(), sf);
  }
  return undefined;
}

function unwrapToObject(
  expr: Expression | undefined,
  sf: SourceFile,
): ObjectLiteralExpression | undefined {
  if (!expr) return undefined;
  if (Node.isObjectLiteralExpression(expr)) return expr;
  if (Node.isSatisfiesExpression(expr) || Node.isAsExpression(expr)) {
    return unwrapToObject(expr.getExpression(), sf);
  }
  if (Node.isIdentifier(expr)) {
    const decl = sf.getVariableDeclaration(expr.getText());
    return unwrapToObject(decl?.getInitializer(), sf);
  }
  return undefined;
}

function getStringProp(obj: ObjectLiteralExpression, name: string): string | undefined {
  const prop = obj.getProperty(name);
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined;
  const init = prop.getInitializer();
  if (init && (Node.isStringLiteral(init) || Node.isNoSubstitutionTemplateLiteral(init))) {
    return init.getLiteralValue();
  }
  return undefined;
}

function getObjectProp(
  obj: ObjectLiteralExpression,
  name: string,
): ObjectLiteralExpression | undefined {
  const prop = obj.getProperty(name);
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined;
  const init = prop.getInitializer();
  return init && Node.isObjectLiteralExpression(init) ? init : undefined;
}

function getStringArrayProp(
  scope: ObjectLiteralExpression | SourceFile,
  name: string,
): string[] | undefined {
  let init: Expression | undefined;
  if (Node.isSourceFile(scope)) {
    const decl = scope.getVariableDeclaration(name);
    init = decl?.getInitializer();
  } else {
    const prop = scope.getProperty(name);
    if (prop && Node.isPropertyAssignment(prop)) init = prop.getInitializer();
  }
  if (!init || !Node.isArrayLiteralExpression(init)) return undefined;
  const out: string[] = [];
  for (const el of init.getElements()) {
    if (Node.isStringLiteral(el) || Node.isNoSubstitutionTemplateLiteral(el)) {
      out.push(el.getLiteralValue());
    } else if (Node.isNumericLiteral(el)) {
      out.push(el.getText());
    }
  }
  return out;
}

/** Fall back to source order of named exports when `__namedExportsOrder` is absent. */
function getNamedExportsOrder(sf: SourceFile): string[] | undefined {
  const names: string[] = [];
  for (const stmt of sf.getVariableStatements()) {
    if (!stmt.isExported()) continue;
    for (const decl of stmt.getDeclarations()) names.push(decl.getName());
  }
  for (const fn of sf.getFunctions()) {
    if (fn.isExported() && !fn.isDefaultExport() && fn.getName()) names.push(fn.getName()!);
  }
  return names.length > 0 ? names : undefined;
}

// Title for a story file that has no explicit `meta.title`, mirroring
// Storybook's autotitle: the path relative to the project's `src` becomes the
// title, so `src/components/atoms/Foo.stories.tsx` → `Components/Atoms/Foo`
// (root `Components`, like Storybook) rather than dropping `components`.
function deriveStoryTitle(relPath: string): string {
  const normalized = relPath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const base = (parts.pop() ?? "").replace(/\.stories\.[^.]+$/, "");
  if (parts[0] === "src") parts.shift();
  // Drop a trailing folder that just repeats the file name (e.g.
  // `atoms/attachmentTag/AttachmentTag.stories.tsx` → `…/AttachmentTag`,
  // not `…/AttachmentTag/AttachmentTag`).
  if (parts.length > 0 && parts[parts.length - 1]!.toLowerCase() === base.toLowerCase()) {
    parts.pop();
  }
  const segs = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return segs.length > 0 ? `${segs.join("/")}/${base}` : base;
}
