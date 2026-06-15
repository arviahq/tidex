import { describe, expect, it } from "vitest";
import { extractNext, summarizeValue } from "../src/wireCallbacks";

describe("extractNext", () => {
  it("first-arg returns the first argument", () => {
    expect(extractNext("first-arg", ["apple"], "pear")).toBe("apple");
    expect(extractNext(undefined, [true], false)).toBe(true);
  });

  it("event-value / event-checked read off the event target", () => {
    expect(extractNext("event-value", [{ target: { value: "hi" } }], "")).toBe("hi");
    expect(extractNext("event-checked", [{ target: { checked: true } }], false)).toBe(true);
  });

  it("toggle flips the previous boolean", () => {
    expect(extractNext("toggle", [], false)).toBe(true);
    expect(extractNext("toggle", [], true)).toBe(false);
  });

  it("constant strategies ignore args", () => {
    expect(extractNext("constant-true", [], false)).toBe(true);
    expect(extractNext("constant-false", [{ whatever: 1 }], true)).toBe(false);
  });

  it("updater applies a functional setter to prev", () => {
    expect(extractNext("updater", [(n: number) => n + 1], 1)).toBe(2);
  });

  it("set/object pass the first-arg payload", () => {
    const set = new Set(["a"]);
    expect(extractNext("set", [set], new Set())).toBe(set);
  });
});

describe("summarizeValue", () => {
  it("summarizes special values without dumping them", () => {
    expect(summarizeValue(new Set(["a", "b"]))).toBe("Set(2)");
    expect(summarizeValue(new Map([["k", 1]]))).toBe("Map(1)");
    expect(summarizeValue({ target: { tagName: "INPUT", value: "x" } })).toBe('input["x"]');
    expect(summarizeValue("hi")).toBe('"hi"');
    expect(summarizeValue(true)).toBe("true");
  });
});
