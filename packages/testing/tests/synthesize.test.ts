import { describe, expect, it } from "vitest";
import type { InteractionBinding, PropSchema } from "@tide/core";
import { stateArgsFor } from "../src/verify-interactions.js";

const binding = (over: Partial<InteractionBinding>): InteractionBinding => ({
  stateProp: "checked",
  handler: "onCheckedChange",
  strategy: "toggle",
  confidence: "high",
  source: "convention",
  ...over,
});

describe("stateArgsFor", () => {
  it("toggles a boolean prop to its interesting state, named after the prop", () => {
    const b = binding({ stateProp: "checked", strategy: "toggle" });
    expect(stateArgsFor(b, { type: "boolean" })).toEqual({
      name: "Checked",
      args: { checked: true },
    });
  });

  it("fills a string value prop", () => {
    const b = binding({ stateProp: "value", handler: "onChange", strategy: "event-value" });
    expect(stateArgsFor(b, { type: "string" })).toEqual({
      name: "Filled",
      args: { value: "Sample text" },
    });
  });

  it("picks a non-default option for a union prop", () => {
    const schema: PropSchema = { type: "union", values: ["sm", "md", "lg"], valueType: "string" };
    const b = binding({ stateProp: "size", handler: "onSizeChange", strategy: "first-arg" });
    expect(stateArgsFor(b, schema)).toEqual({ name: "Size", args: { size: "lg" } });
  });

  it("treats a boolean strategy as boolean even when the schema is missing", () => {
    const b = binding({ stateProp: "open", handler: "onClose", strategy: "constant-false" });
    expect(stateArgsFor(b, undefined)).toEqual({ name: "Open", args: { open: true } });
  });

  it("skips numbers, sets, and objects (no robust synthesis)", () => {
    const num = binding({ stateProp: "value", handler: "onChange", strategy: "first-arg" });
    expect(stateArgsFor(num, { type: "number" })).toBeNull();
    const set = binding({
      stateProp: "selectedKeys",
      handler: "onSelectionChange",
      strategy: "set",
    });
    expect(stateArgsFor(set, { type: "set" })).toBeNull();
  });
});
