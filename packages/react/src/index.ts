import type { PropSchema } from "@tide/core";

export type ControlKind = "boolean" | "string" | "number" | "union" | "object";

export interface ControlDef {
  name: string;
  kind: ControlKind;
  options?: string[];
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
      return { name, kind: "union", options: schema.values, schema };
    case "object":
      return { name, kind: "object", schema };
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

  const axes = unionProps.map(([name, schema]) => ({
    name,
    values: (schema as { values: string[] }).values,
  }));

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
    if (typeof value === "boolean") {
      attrs.push(key);
    } else if (typeof value === "number") {
      attrs.push(`${key}={${value}}`);
    } else if (typeof value === "string") {
      // Plain strings use the `="..."` form; quote-containing strings fall back
      // to an expression so the snippet stays valid JSX.
      attrs.push(value.includes('"') ? `${key}={${JSON.stringify(value)}}` : `${key}="${value}"`);
    } else {
      // Arrays/objects (and anything else) render as a JSX expression instead of
      // the useless `[object Object]` from string coercion.
      attrs.push(`${key}={${JSON.stringify(value)}}`);
    }
  }
  const attrStr = attrs.length ? " " + attrs.join(" ") : "";
  return `<${componentName}${attrStr} />`;
}
