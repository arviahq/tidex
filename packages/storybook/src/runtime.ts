// Client-safe entry (no Node/Vite imports) — bundled into the preview and
// imported by the manager. Maps a composed story's resolved Storybook argTypes
// into Tide's PropSchema so the manager's controls mirror Storybook's.
import type { PropSchema } from "@tide/core";

/** postMessage type: preview → manager with a CSF story's resolved metadata. */
export const STORY_META_MESSAGE = "TIDE_STORY_META";

/** Raw metadata attached to a composed CSF story module by generated code. */
export interface StoryHydration {
  argTypes: Record<string, RawArgType>;
  args: Record<string, unknown>;
  componentName: string | null;
  parameters: Record<string, unknown>;
}

/** What the preview posts to the manager after composing a story. */
export interface StoryMetaPayload {
  storyId: string;
  /** argTypes mapped to Tide control schemas, keyed by arg name. */
  props: Record<string, PropSchema>;
  /** The story's resolved initial args (e.g. `{ ext: "pdf", size: "2xl" }`). */
  args: Record<string, unknown>;
  /** The underlying component's display name, for the Docs/JSX snippet. */
  componentName: string | null;
  /** `parameters.layout` ("centered" | "fullscreen" | "padded"), if set. */
  layout: string | null;
}

interface RawArgType {
  name?: string;
  control?: string | { type?: string; options?: unknown[] } | false | null;
  options?: unknown[];
  type?: { name?: string; required?: boolean; value?: unknown };
  table?: { disable?: boolean; category?: string };
  description?: string;
}

function controlType(c: RawArgType["control"]): string | undefined {
  if (typeof c === "string") return c;
  if (c && typeof c === "object") return c.type;
  return undefined;
}

// Normalize an option/value list to plain strings. Handles both Storybook's
// normalized `["sm","md"]` and react-docgen-typescript's `[{ value: '"sm"' }]`
// (objects with quote-wrapped string literals).
function toStringOptions(options: unknown[]): string[] {
  const out: string[] = [];
  for (const o of options) {
    let v: unknown = o;
    if (o && typeof o === "object" && "value" in o) v = (o as { value: unknown }).value;
    if (typeof v === "number") {
      out.push(String(v));
    } else if (typeof v === "string") {
      const unquoted = v.replace(/^['"]|['"]$/g, "");
      if (unquoted && unquoted !== "undefined" && unquoted !== "null") out.push(unquoted);
    }
  }
  return out;
}

/** Map one Storybook argType to a Tide PropSchema, or null to omit it. */
function mapArgType(name: string, at: RawArgType): PropSchema | null {
  // Storybook hides args with `control: false` or `table.disable`.
  if (at.control === false || at.table?.disable) return null;
  // Action/event args aren't controllable props — they live in Interactions.
  if (at.type?.name === "function" || /^on[A-Z]/.test(name)) return null;

  const required = at.type?.required === true;
  const description = at.description;

  const options =
    (Array.isArray(at.options) && at.options) ||
    (typeof at.control === "object" && at.control && Array.isArray(at.control.options)
      ? at.control.options
      : null);
  if (options) {
    const values = toStringOptions(options);
    if (values.length > 0) return { type: "union", values, required, description };
  }

  const ct = controlType(at.control);
  switch (ct) {
    case "boolean":
      return { type: "boolean", required, description };
    case "number":
    case "range":
      return { type: "number", required, description };
    case "text":
    case "color":
    case "date":
      return { type: "string", required, description };
  }

  switch (at.type?.name) {
    case "boolean":
      return { type: "boolean", required, description };
    case "number":
      return { type: "number", required, description };
    case "string":
      return { type: "string", required, description };
    case "enum": {
      const values = Array.isArray(at.type?.value) ? toStringOptions(at.type.value) : [];
      if (values.length > 0) return { type: "union", values, required, description };
      return { type: "string", required, description };
    }
  }

  return null;
}

/** Map a composed story's resolved argTypes to Tide control schemas. */
export function mapStorybookArgTypes(
  argTypes: Record<string, RawArgType> | undefined,
): Record<string, PropSchema> {
  const out: Record<string, PropSchema> = {};
  if (!argTypes) return out;
  for (const [name, at] of Object.entries(argTypes)) {
    if (!at || typeof at !== "object") continue;
    const schema = mapArgType(name, at);
    if (schema) out[name] = schema;
  }
  return out;
}
