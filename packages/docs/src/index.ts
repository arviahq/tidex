import type { ComponentEntry, PropSchema, PropsMap } from "@tide/core";
import { generateJsxSnippet } from "@tide/react";

export interface PropDoc {
  name: string;
  typeLabel: string;
  required: boolean;
  description?: string;
}

export interface ComponentDoc {
  name: string;
  title: string;
  props: PropDoc[];
  exampleSnippet: string;
  args: Record<string, unknown>;
}

function propTypeLabel(schema: PropSchema): string {
  switch (schema.type) {
    case "union":
      return schema.values.join(" | ");
    case "object":
      return "object";
    case "array":
      return schema.element ? `${propTypeLabel(schema.element)}[]` : "array";
    default:
      return schema.type;
  }
}

export function generateComponentDoc(
  component: ComponentEntry,
  props: Record<string, PropSchema>,
  args: Record<string, unknown>,
): ComponentDoc {
  const propDocs: PropDoc[] = Object.entries(props)
    .filter(([, s]) => s.type !== "unknown")
    .map(([name, schema]) => ({
      name,
      typeLabel: propTypeLabel(schema),
      required: schema.required !== false && schema.type !== "boolean",
      description: schema.description,
    }));

  return {
    name: component.name,
    title: component.title,
    props: propDocs,
    exampleSnippet: generateJsxSnippet(component.name, args),
    args,
  };
}

export function generateDocs(
  components: ComponentEntry[],
  propsMap: PropsMap,
  defaultArgs: Record<string, Record<string, unknown>>,
): ComponentDoc[] {
  return components.map((c) =>
    generateComponentDoc(c, propsMap[c.name] ?? {}, defaultArgs[c.name] ?? {}),
  );
}
