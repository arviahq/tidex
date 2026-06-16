import { coerceUnionValue, type PropSchema } from "@tide/core";

export { coerceUnionValue };

/** A path into a nested value: object keys and array indices. */
export type ControlPath = ReadonlyArray<string | number>;

/** Read the value at `path` inside `root` (objects, arrays, Maps, Sets-by-index). */
export function getAtPath(root: unknown, path: ControlPath): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (current == null) return undefined;
    if (current instanceof Map) {
      current = current.get(key);
    } else if (current instanceof Set) {
      current = [...current][key as number];
    } else {
      current = (current as Record<string | number, unknown>)[key];
    }
  }
  return current;
}

/** Shallow-clone a container, preserving Map/Set/Array/object identity kind. */
function cloneContainer(value: unknown): unknown {
  if (value instanceof Map) return new Map(value);
  if (value instanceof Set) return new Set(value);
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...(value as Record<string, unknown>) };
  return value;
}

/**
 * Immutably set `value` at `path` inside `root`, cloning every container along
 * the way so React sees new references. Creates intermediate objects/arrays as
 * needed (numeric path segment → array). Map/Set containers are preserved.
 */
export function setAtPath(root: unknown, path: ControlPath, value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const key = head!;

  if (root instanceof Map) {
    const next = new Map(root);
    next.set(key, setAtPath(next.get(key), rest, value));
    return next;
  }

  const base =
    root && typeof root === "object" ? cloneContainer(root) : typeof key === "number" ? [] : {};
  (base as Record<string | number, unknown>)[key] = setAtPath(
    (base as Record<string | number, unknown>)[key],
    rest,
    value,
  );
  return base;
}

/** Outcome of validating a single value against its schema. */
export type ValidationError = { message: string } | null;

/**
 * Validate a primitive `value` against its `schema` (required + metadata
 * constraints). Returns `null` when valid. Containers are validated per-leaf by
 * their controls, so this focuses on the directly-editable scalar shapes.
 */
export function validateValue(schema: PropSchema, value: unknown): ValidationError {
  const required = "required" in schema && schema.required === true;
  const empty = value === undefined || value === null || value === "";
  if (required && empty) return { message: "Required" };
  if (empty) return null;

  const meta = "meta" in schema ? schema.meta : undefined;

  if (schema.type === "string" && typeof value === "string") {
    if (meta?.minLength != null && value.length < meta.minLength)
      return { message: `Min ${meta.minLength} characters` };
    if (meta?.maxLength != null && value.length > meta.maxLength)
      return { message: `Max ${meta.maxLength} characters` };
    if (meta?.pattern) {
      try {
        if (!new RegExp(meta.pattern).test(value)) return { message: "Does not match pattern" };
      } catch {
        // An unparseable pattern is the author's bug, not the user's — ignore.
      }
    }
    if (meta?.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return { message: "Invalid email" };
    if (meta?.format === "url") {
      try {
        new URL(value);
      } catch {
        return { message: "Invalid URL" };
      }
    }
  }

  if (schema.type === "number" && typeof value === "number") {
    if (Number.isNaN(value)) return { message: "Not a number" };
    if (meta?.min != null && value < meta.min) return { message: `Min ${meta.min}` };
    if (meta?.max != null && value > meta.max) return { message: `Max ${meta.max}` };
  }

  return null;
}

export type ControlKind =
  | "boolean"
  | "string"
  | "number"
  | "union"
  | "object"
  | "array"
  | "date"
  | "set"
  | "tuple"
  | "map"
  | "record"
  | "variant";

export interface ControlDef {
  name: string;
  kind: ControlKind;
  options?: string[];
  /** For union controls: the literal kind to coerce a chosen option back to. */
  valueType?: "string" | "number" | "boolean";
  schema: PropSchema;
}

export function propToControl(name: string, schema: PropSchema): ControlDef | null {
  if (schema.type === "unknown" || schema.type === "callback") return null;

  switch (schema.type) {
    case "boolean":
      return { name, kind: "boolean", schema };
    case "string":
      return { name, kind: "string", schema };
    case "number":
      return { name, kind: "number", schema };
    case "union":
      return { name, kind: "union", options: schema.values, valueType: schema.valueType, schema };
    case "object":
      return { name, kind: "object", schema };
    case "array":
      return { name, kind: "array", schema };
    case "date":
      return { name, kind: "date", schema };
    case "set":
      return { name, kind: "set", schema };
    case "tuple":
      return { name, kind: "tuple", schema };
    case "map":
      return { name, kind: "map", schema };
    case "record":
      return { name, kind: "record", schema };
    case "variant":
      return { name, kind: "variant", options: schema.variants.map((v) => v.label), schema };
    default:
      return null;
  }
}

export function computeVariants(
  props: Record<string, PropSchema>,
  max = 12,
): Array<Record<string, unknown>> {
  const unionProps = Object.entries(props).filter(([, s]) => s.type === "union");

  if (unionProps.length === 0) return [];

  const axes = unionProps.map(([name, schema]) => {
    const u = schema as { values: string[]; valueType?: "string" | "number" | "boolean" };
    return { name, values: u.values.map((v) => coerceUnionValue(v, u.valueType)) };
  });

  const results: Array<Record<string, unknown>> = [];

  function cartesian(index: number, current: Record<string, unknown>) {
    if (results.length >= max) return;
    if (index === axes.length) {
      results.push({ ...current });
      return;
    }
    const axis = axes[index]!;
    for (const value of axis.values) {
      cartesian(index + 1, { ...current, [axis.name]: value });
    }
  }

  cartesian(0, {});
  return results;
}

export function formatVariantLabel(args: Record<string, unknown>): string {
  return Object.values(args)
    .map((v) => String(v).charAt(0).toUpperCase() + String(v).slice(1))
    .join(" / ");
}

export function generateJsxSnippet(componentName: string, args: Record<string, unknown>): string {
  const attrs: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    attrs.push(formatJsxAttr(key, value));
  }
  if (attrs.length === 0) {
    return `<${componentName} />`;
  }
  return `<${componentName}\n${attrs.map((attr) => indentAttrLines(attr)).join("\n")}\n/>`;
}

function indentAttrLines(attr: string): string {
  return attr
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function formatJsxAttr(key: string, value: unknown): string {
  if (value instanceof Date) {
    return `${key}={new Date(${JSON.stringify(value.toISOString())})}`;
  }
  if (value instanceof Set) {
    return formatJsxExpressionAttr(key, `new Set(${JSON.stringify([...value])})`);
  }
  if (value instanceof Map) {
    return formatJsxExpressionAttr(key, `new Map(${JSON.stringify([...value])})`);
  }
  if (typeof value === "boolean") {
    return key;
  }
  if (typeof value === "number") {
    return `${key}={${value}}`;
  }
  if (typeof value === "string") {
    return value.includes('"') ? `${key}={${JSON.stringify(value)}}` : `${key}="${value}"`;
  }
  return formatJsxExpressionAttr(key, JSON.stringify(value, null, 2));
}

function formatJsxExpressionAttr(key: string, expression: string): string {
  if (!expression.includes("\n")) {
    return `${key}={${expression}}`;
  }
  const lines = expression.split("\n");
  const [first, ...rest] = lines;
  return `${key}={${first}\n${rest.join("\n")}}`;
}
