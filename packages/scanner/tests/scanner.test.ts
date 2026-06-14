import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverComponents } from "../src/discover.js";
import { extractProps } from "../src/extract-props.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures");

describe("discoverComponents", () => {
  it("finds export function components", () => {
    const file = path.join(fixtures, "export-function.tsx");
    const components = discoverComponents(fixtures, [file]);
    expect(components).toHaveLength(1);
    expect(components[0]?.name).toBe("Button");
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

  it("ignores non-component exports", () => {
    const file = path.join(fixtures, "non-component.tsx");
    const components = discoverComponents(fixtures, [file]);
    expect(components).toHaveLength(0);
  });
});

describe("extractProps", () => {
  it("extracts union and boolean props", () => {
    const file = path.join(fixtures, "button-with-props.tsx");
    const components = discoverComponents(fixtures, [file]);
    const props = extractProps(fixtures, components);
    expect(props.Button).toEqual({
      variant: { type: "union", values: ["primary", "secondary"], required: true },
      size: { type: "union", values: ["sm", "md", "lg"], required: true },
      disabled: { type: "boolean", required: false },
    });
  });
});
