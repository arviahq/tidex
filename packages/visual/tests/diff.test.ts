import { describe, expect, it } from "vitest";
import type { VisualSnapshot } from "../src/snapshot-types.js";
import { computeVisualDiff } from "../src/diff/summarize.js";
import { domDiff } from "../src/diff/domDiff.js";
import { styleDiff } from "../src/diff/styleDiff.js";
import { layoutDiff } from "../src/diff/layoutDiff.js";
import { a11yDiff } from "../src/diff/a11yDiff.js";

function badge(overrides: Partial<VisualSnapshot> = {}): VisualSnapshot {
  return {
    meta: {
      version: 1,
      componentId: "Badge",
      viewport: { width: 800, height: 600, dpr: 2 },
      capturedAt: "",
    },
    dom: [
      { key: "", tag: "div", classes: ["badge"] },
      { key: "0", tag: "#text", text: "info" },
    ],
    styles: { "": { "background-color": "#4f46e5", color: "#ffffff", "font-size": "14px" } },
    layout: { "": { x: 0, y: 0, w: 60, h: 24 } },
    a11y: '- generic "info"',
    ...overrides,
  };
}

describe("styleDiff", () => {
  it("reports a color prop change as isColor", () => {
    const base = badge();
    const cur = badge({
      styles: { "": { "background-color": "#635bff", color: "#ffffff", "font-size": "14px" } },
    });
    const d = styleDiff(base.styles, cur.styles);
    expect(d.totalProps).toBe(1);
    expect(d.nodes[0]!.props[0]).toMatchObject({
      prop: "background-color",
      from: "#4f46e5",
      to: "#635bff",
      isColor: true,
    });
  });
});

describe("domDiff", () => {
  it("detects an added node", () => {
    const base = badge();
    const cur = badge({
      dom: [...badge().dom, { key: "1", tag: "span", classes: ["dot"] }],
    });
    const d = domDiff(base.dom, cur.dom);
    expect(d.added).toEqual([{ key: "1", tag: "span" }]);
    expect(d.removed).toHaveLength(0);
  });
});

describe("layoutDiff", () => {
  it("ignores sub-tolerance jitter but reports real moves", () => {
    const base = badge();
    const within = layoutDiff(base.layout, { "": { x: 1, y: 0, w: 60, h: 24 } }, 1);
    expect(within.nodes).toHaveLength(0);
    const moved = layoutDiff(base.layout, { "": { x: 4, y: 0, w: 60, h: 24 } }, 1);
    expect(moved.nodes[0]!.phrase).toBe("moved 4px right");
  });
});

describe("a11yDiff", () => {
  it("detects an accessible-name change invisible to pixels", () => {
    const d = a11yDiff('- generic "info"', '- generic "success"');
    expect(d.changes).toContainEqual({ kind: "added", line: '- generic "success"' });
    expect(d.changes).toContainEqual({ kind: "removed", line: '- generic "info"' });
  });
});

describe("computeVisualDiff classification", () => {
  it("identical when nothing changed and no pixels", () => {
    const res = computeVisualDiff(badge(), badge(), { pixelsChanged: 0 });
    expect(res.summary.classification).toBe("identical");
  });

  it("pixel-noise when pixels change but all semantic layers match", () => {
    const res = computeVisualDiff(badge(), badge(), { pixelsChanged: 500 });
    expect(res.summary.classification).toBe("pixel-noise");
    expect(res.summary.semanticChanged).toBe(false);
    expect(res.summary.verdict).toContain("Likely anti-aliasing noise");
  });

  it("semantic with a single-style verdict sentence", () => {
    const cur = badge({
      styles: { "": { "background-color": "#635bff", color: "#ffffff", "font-size": "14px" } },
    });
    const res = computeVisualDiff(badge(), cur, { pixelsChanged: 1200 });
    expect(res.summary.classification).toBe("semantic");
    expect(res.summary.verdict).toBe(
      "1 style change: background-color #4f46e5 → #635bff on div.badge; everything else identical.",
    );
  });
});
