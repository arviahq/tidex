import { describe, expect, it } from "vitest";
import { mapStorybookArgTypes } from "../src/runtime.js";

describe("mapStorybookArgTypes", () => {
  it("maps select/options to a union (computed options resolved by composeStory)", () => {
    const out = mapStorybookArgTypes({
      ext: { control: "select", options: ["pdf", "docx", "txt"] },
    });
    expect(out.ext).toEqual({
      type: "union",
      values: ["pdf", "docx", "txt"],
      required: false,
      description: undefined,
    });
  });

  it("reads options nested under control", () => {
    const out = mapStorybookArgTypes({
      size: { control: { type: "radio", options: ["sm", "md", "lg"] } },
    });
    expect(out.size).toMatchObject({ type: "union", values: ["sm", "md", "lg"] });
  });

  it("maps primitive control types and carries required", () => {
    const out = mapStorybookArgTypes({
      disabled: { control: "boolean", type: { name: "boolean", required: true } },
      label: { control: "text" },
      count: { control: "number" },
    });
    expect(out.disabled).toMatchObject({ type: "boolean", required: true });
    expect(out.label).toMatchObject({ type: "string" });
    expect(out.count).toMatchObject({ type: "number" });
  });

  it("infers from type.name when no control is given", () => {
    const out = mapStorybookArgTypes({
      tone: { type: { name: "enum", value: ["info", "warn"] } },
      open: { type: { name: "boolean" } },
    });
    expect(out.tone).toMatchObject({ type: "union", values: ["info", "warn"] });
    expect(out.open).toMatchObject({ type: "boolean" });
  });

  it("normalizes react-docgen value shapes (quoted strings / {value} objects)", () => {
    const out = mapStorybookArgTypes({
      size: {
        control: { type: "select" },
        options: [{ value: '"sm"' }, { value: '"md"' }, { value: "undefined" }],
      } as never,
    });
    expect(out.size).toMatchObject({ type: "union", values: ["sm", "md"] });
  });

  it("omits disabled controls, actions, and event handlers", () => {
    const out = mapStorybookArgTypes({
      hidden: { control: false },
      internal: { control: "text", table: { disable: true } },
      onClick: { control: "text" },
      onChange: { type: { name: "function" } },
    });
    expect(out).toEqual({});
  });
});
