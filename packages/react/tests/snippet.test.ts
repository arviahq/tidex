import { describe, expect, it } from "vitest";
import { generateJsxSnippet } from "../src/index.js";

describe("generateJsxSnippet", () => {
  it("renders primitives in their natural JSX form", () => {
    expect(generateJsxSnippet("Button", { variant: "primary", size: 12, disabled: true })).toBe(
      '<Button variant="primary" size={12} disabled />',
    );
  });

  it("omits empty/false/undefined/null args", () => {
    expect(generateJsxSnippet("Button", { a: "", b: false, c: undefined, d: null, e: "x" })).toBe(
      '<Button e="x" />',
    );
  });

  it("renders arrays and objects as JSX expressions, not [object Object]", () => {
    const out = generateJsxSnippet("Picklist", {
      items: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
    });
    expect(out).toBe('<Picklist items={[{"label":"A","value":"a"},{"label":"B","value":"b"}]} />');
    expect(out).not.toContain("[object Object]");
  });

  it("escapes strings containing double quotes", () => {
    expect(generateJsxSnippet("Text", { title: 'a "quote"' })).toBe(
      '<Text title={"a \\"quote\\""} />',
    );
  });
});
