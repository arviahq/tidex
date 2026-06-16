import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getComponentId } from "@tide/core";
import { discoverComponents, deriveComponentId } from "../src/discover.js";
import { extractProps } from "../src/extract-props.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures");

describe("discoverComponents", () => {
  it("finds export function components", () => {
    const file = path.join(fixtures, "export-function.tsx");
    const components = discoverComponents(fixtures, [file]);
    expect(components).toHaveLength(1);
    expect(components[0]?.name).toBe("Button");
    expect(components[0]?.id).toBe("Button");
  });

  it("finds export const arrow components", () => {
    const file = path.join(fixtures, "export-const.tsx");
    const components = discoverComponents(fixtures, [file]);
    expect(components).toHaveLength(1);
    expect(components[0]?.name).toBe("Card");
  });

  it("finds default export components", () => {
    const file = path.join(fixtures, "export-default.tsx");
    const components = discoverComponents(fixtures, [file]);
    expect(components).toHaveLength(1);
    expect(components[0]?.isDefault).toBe(true);
  });

  it("finds forwardRef components", () => {
    const file = path.join(fixtures, "export-forward-ref.tsx");
    const components = discoverComponents(fixtures, [file]);
    expect(components).toHaveLength(1);
    expect(components[0]?.name).toBe("Input");
  });

  it("ignores non-component exports", () => {
    const file = path.join(fixtures, "non-component.tsx");
    const components = discoverComponents(fixtures, [file]);
    expect(components).toHaveLength(0);
  });

  it("derives folder-scoped ids", () => {
    expect(
      deriveComponentId("src/components/forms/Checkbox.tsx", "Checkbox", "src/components"),
    ).toBe("forms/Checkbox");
  });
});

describe("extractProps", () => {
  it("extracts union and boolean props", async () => {
    const file = path.join(fixtures, "button-with-props.tsx");
    const components = discoverComponents(fixtures, [file]);
    const props = await extractProps(fixtures, components);
    const id = getComponentId(components[0]!);
    expect(props[id]).toEqual({
      variant: {
        type: "union",
        values: ["primary", "secondary"],
        valueType: "string",
        required: true,
      },
      size: { type: "union", values: ["sm", "md", "lg"], valueType: "string", required: true },
      disabled: { type: "boolean", required: false },
    });
  });

  it("resolves imported prop types within the project", async () => {
    const file = path.join(fixtures, "imported-props.tsx");
    const components = discoverComponents(fixtures, [file]);
    const props = await extractProps(fixtures, components);
    const id = getComponentId(components[0]!);
    expect(props[id]?.label).toEqual({
      type: "string",
      required: true,
      description: "Visible label text",
    });
    expect(props[id]?.tone).toEqual({
      type: "union",
      values: ["neutral", "danger"],
      valueType: "string",
      required: true,
    });
  });

  it("resolves numeric literal unions and array types", async () => {
    const file = path.join(fixtures, "numeric-array-props.tsx");
    const components = discoverComponents(fixtures, [file]);
    const props = await extractProps(fixtures, components);
    const id = getComponentId(components[0]!);
    expect(props[id]?.columns).toEqual({
      type: "union",
      values: ["1", "2", "3", "4"],
      valueType: "number",
      required: true,
    });
    expect(props[id]?.tags).toEqual({
      type: "array",
      element: { type: "string" },
      required: true,
    });
  });

  it("resolves Date and Set types", async () => {
    const file = path.join(fixtures, "date-set-props.tsx");
    const components = discoverComponents(fixtures, [file]);
    const props = await extractProps(fixtures, components);
    const id = getComponentId(components[0]!);
    expect(props[id]?.when).toEqual({ type: "date", required: true });
    expect(props[id]?.tags).toEqual({
      type: "set",
      element: { type: "string" },
      required: true,
    });
  });

  it("resolves tuples, maps, records, variants, and JSDoc metadata", async () => {
    const file = path.join(fixtures, "advanced-props.tsx");
    const components = discoverComponents(fixtures, [file]);
    const props = await extractProps(fixtures, components);
    const id = getComponentId(components[0]!);
    const p = props[id]!;

    expect(p.opacity).toEqual({
      type: "number",
      required: true,
      meta: { min: 0, max: 100, step: 5, slider: true },
    });
    // Tags inline after a description are still captured, and the description
    // is cleaned of the tag text.
    expect(p.fill).toEqual({
      type: "number",
      required: true,
      description: "Fill level.",
      meta: { min: 0, max: 100, slider: true },
    });
    expect(p.accent).toEqual({ type: "string", required: true, meta: { format: "color" } });
    expect(p.bio).toEqual({
      type: "string",
      required: true,
      meta: { format: "multiline", maxLength: 280 },
    });

    expect(p.position).toEqual({
      type: "tuple",
      elements: [{ type: "number" }, { type: "number" }],
      required: true,
    });
    expect(p.named).toEqual({
      type: "tuple",
      elements: [{ type: "number" }, { type: "number" }],
      labels: ["x", "y"],
      required: true,
    });

    expect(p.theme).toEqual({
      type: "map",
      key: { type: "string" },
      value: { type: "string" },
      required: true,
    });
    expect(p.users).toEqual({
      type: "record",
      key: { type: "string" },
      value: {
        type: "object",
        properties: {
          name: { type: "string", required: true },
          role: { type: "union", values: ["admin", "editor"], valueType: "string", required: true },
        },
      },
      required: true,
    });

    expect(p.avatar?.type).toBe("variant");
    if (p.avatar?.type === "variant") {
      expect(p.avatar.discriminant).toBe("type");
      expect(p.avatar.variants.map((v) => v.label)).toEqual(["image", "initials"]);
    }
  });
});
