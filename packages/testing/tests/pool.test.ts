import { describe, expect, it } from "vitest";
import { defaultWorkers, mapPool } from "../src/pool.js";

describe("mapPool", () => {
  it("returns results in input order", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapPool(items, 2, async (n) => n * 2);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("caps concurrency at item count", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await mapPool([1, 2, 3], 8, async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
      return 0;
    });
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it("propagates errors", async () => {
    await expect(
      mapPool([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });

  it("returns an empty array for no items", async () => {
    expect(await mapPool([], 4, async () => 1)).toEqual([]);
  });
});

describe("defaultWorkers", () => {
  it("uses the override when positive", () => {
    expect(defaultWorkers(6)).toBe(6);
  });

  it("falls back when override is missing or invalid", () => {
    const fallback = defaultWorkers();
    expect(fallback).toBeGreaterThanOrEqual(1);
    expect(fallback).toBeLessThanOrEqual(4);
    expect(defaultWorkers(0)).toBe(fallback);
  });
});
