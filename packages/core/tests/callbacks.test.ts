import { describe, expect, it } from "vitest";
import { inferStateKeyFromCallback } from "../src/index.js";

describe("inferStateKeyFromCallback", () => {
  it("maps *Change callbacks to camelCase state keys", () => {
    expect(inferStateKeyFromCallback("onValueChange", ["value"])).toBe("value");
    expect(inferStateKeyFromCallback("onOpenChange", ["open"])).toBe("open");
    expect(inferStateKeyFromCallback("onCheckedChange", ["checked"])).toBe("checked");
    expect(inferStateKeyFromCallback("onSelectedChange", ["selected"])).toBe("selected");
  });

  it("resolves onChange to value or checked when present", () => {
    expect(inferStateKeyFromCallback("onChange", ["value", "label"])).toBe("value");
    expect(inferStateKeyFromCallback("onChange", ["checked"])).toBe("checked");
    expect(inferStateKeyFromCallback("onChange", ["label"])).toBeNull();
  });

  it("returns null for action-only handlers", () => {
    expect(inferStateKeyFromCallback("onClick", ["onClick"])).toBeNull();
    expect(inferStateKeyFromCallback("onSubmit", [])).toBeNull();
  });

  it("returns null when inferred key is not on the component", () => {
    expect(inferStateKeyFromCallback("onValueChange", ["open"])).toBeNull();
  });
});
