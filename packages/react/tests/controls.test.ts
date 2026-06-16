import { describe, expect, it } from "vitest";
import { getAtPath, setAtPath, validateValue } from "../src/index.js";
import type { PropSchema } from "@tidex/core";

describe("setAtPath / getAtPath", () => {
  it("sets a nested object value immutably", () => {
    const root = { profile: { name: "Jane" } };
    const next = setAtPath(root, ["profile", "name"], "John") as typeof root;
    expect(next.profile.name).toBe("John");
    expect(root.profile.name).toBe("Jane"); // original untouched
    expect(next).not.toBe(root);
    expect(next.profile).not.toBe(root.profile);
  });

  it("sets an array index and preserves siblings", () => {
    const root = { tags: ["a", "b", "c"] };
    const next = setAtPath(root, ["tags", 1], "B") as typeof root;
    expect(next.tags).toEqual(["a", "B", "c"]);
    expect(root.tags).toEqual(["a", "b", "c"]);
  });

  it("creates intermediate arrays for numeric segments", () => {
    const next = setAtPath({}, ["items", 0, "label"], "x") as Record<string, unknown>;
    expect(next).toEqual({ items: [{ label: "x" }] });
  });

  it("preserves Map containers when setting through them", () => {
    const root = new Map<string, { n: number }>([["a", { n: 1 }]]);
    const next = setAtPath(root, ["a", "n"], 2) as Map<string, { n: number }>;
    expect(next).toBeInstanceOf(Map);
    expect(next.get("a")).toEqual({ n: 2 });
    expect(root.get("a")).toEqual({ n: 1 });
  });

  it("reads values through objects, arrays, and maps", () => {
    const root = { teams: [{ name: "FE" }], by: new Map([["x", 9]]) };
    expect(getAtPath(root, ["teams", 0, "name"])).toBe("FE");
    expect(getAtPath(root, ["by", "x"])).toBe(9);
    expect(getAtPath(root, ["nope", "deep"])).toBeUndefined();
  });
});

describe("validateValue", () => {
  it("flags required empties", () => {
    const schema: PropSchema = { type: "string", required: true };
    expect(validateValue(schema, "")).toEqual({ message: "Required" });
    expect(validateValue(schema, "x")).toBeNull();
  });

  it("enforces numeric min/max from metadata", () => {
    const schema: PropSchema = { type: "number", meta: { min: 0, max: 10 } };
    expect(validateValue(schema, -1)).toEqual({ message: "Min 0" });
    expect(validateValue(schema, 11)).toEqual({ message: "Max 10" });
    expect(validateValue(schema, 5)).toBeNull();
  });

  it("validates string length, pattern, email, and url formats", () => {
    expect(validateValue({ type: "string", meta: { maxLength: 3 } }, "abcd")).toEqual({
      message: "Max 3 characters",
    });
    expect(validateValue({ type: "string", meta: { pattern: "^\\d+$" } }, "12a")).toEqual({
      message: "Does not match pattern",
    });
    expect(validateValue({ type: "string", meta: { format: "email" } }, "nope")).toEqual({
      message: "Invalid email",
    });
    expect(validateValue({ type: "string", meta: { format: "url" } }, "not a url")).toEqual({
      message: "Invalid URL",
    });
    expect(validateValue({ type: "string", meta: { format: "url" } }, "https://x.io")).toBeNull();
  });

  it("skips validation for optional empties", () => {
    expect(validateValue({ type: "string", meta: { minLength: 5 } }, "")).toBeNull();
  });
});
