import { describe, expect, it } from "vitest";
import { generateJsxSnippet } from "../src/index.js";

describe("generateJsxSnippet", () => {
  it("renders primitives in their natural JSX form", () => {
    expect(generateJsxSnippet("Button", { variant: "primary", size: 12, disabled: true })).toBe(
      '<Button\n  variant="primary"\n  size={12}\n  disabled\n/>',
    );
  });

  it("omits empty/false/undefined/null args", () => {
    expect(generateJsxSnippet("Button", { a: "", b: false, c: undefined, d: null, e: "x" })).toBe(
      '<Button\n  e="x"\n/>',
    );
  });

  it("pretty-prints object and array props", () => {
    const out = generateJsxSnippet("Picklist", {
      items: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
    });
    expect(out).toBe(
      `<Picklist
  items={[
    {
      "label": "A",
      "value": "a"
    },
    {
      "label": "B",
      "value": "b"
    }
  ]}
/>`,
    );
    expect(out).not.toContain("[object Object]");
  });

  it("pretty-prints nested object props", () => {
    expect(
      generateJsxSnippet("Banner", {
        message: "Review the latest updates and confirm your settings.",
        action: { label: "Monthly revenue", href: "Example" },
        tone: "info",
      }),
    ).toBe(
      `<Banner
  message="Review the latest updates and confirm your settings."
  action={{
    "label": "Monthly revenue",
    "href": "Example"
  }}
  tone="info"
/>`,
    );
  });

  it("escapes strings containing double quotes", () => {
    expect(generateJsxSnippet("Text", { title: 'a "quote"' })).toBe(
      '<Text\n  title={"a \\"quote\\""}\n/>',
    );
  });
});
