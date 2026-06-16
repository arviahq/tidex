// Multi-layer visual snapshot model. A snapshot records, for one rendered story,
// the structured layers we diff (DOM, computed styles, layout geometry, a11y) plus
// a reference to the screenshot. Pure types + helpers — no Playwright/Node imports —
// so they're shared by the capture side and the (browser-free) diff engine.

/** Bump when the captured shape changes so stale committed baselines are skipped. */
export const VISUAL_SNAPSHOT_VERSION = 1;

/**
 * Stable, path-based node identity: child indices from the root joined by "/".
 * Root is "". Independent of markup ids/classes/text, so volatile ids can be
 * dropped while baseline/current still align node-for-node.
 */
export type NodeKey = string;

/**
 * Curated computed-style properties (kebab-case for getPropertyValue). Deliberately
 * small (~40) to bound committed-JSON size and noise. Animation/transition props are
 * excluded — they're neutralized during capture.
 */
export const CURATED_STYLE_PROPS: readonly string[] = [
  // box / layout (geometry/size is covered — integer-rounded — by the layout layer)
  "display",
  "position",
  "box-sizing",
  "flex-direction",
  "justify-content",
  "align-items",
  "gap",
  "grid-template-columns",
  // color / background
  "color",
  "background-color",
  "background-image",
  // typography
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration-line",
  "text-transform",
  // border / radius
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-style",
  "border-color",
  "border-radius",
  // effects
  "box-shadow",
  "text-shadow",
  "opacity",
  "visibility",
  "transform",
];

/** Attributes dropped during capture: inline styles + volatile/generated id refs. */
const DROP_ATTRS = new Set([
  "style",
  "id",
  "for",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
]);

/**
 * Strip volatile attributes so structurally-identical renders compare equal.
 * Pure + browser-free so it's the single source of truth (the in-page walker
 * captures raw attrs; this runs over them afterward) and is unit-testable.
 */
export function filterAttrs(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs)) {
    if (DROP_ATTRS.has(name)) continue;
    if (name.startsWith("data-tidex")) continue;
    out[name] = value;
  }
  return out;
}

export interface SnapshotMeta {
  version: number;
  componentId: string;
  args?: Record<string, unknown>;
  theme?: "light" | "dark";
  viewport: { width: number; height: number; dpr: number };
  /** Informational only — never diffed. */
  capturedAt: string;
}

export interface DomNode {
  key: NodeKey;
  /** "#text" for text nodes, else the lowercase tag name. */
  tag: string;
  /** Filtered, stable attributes. Absent for text nodes or when empty. */
  attrs?: Record<string, string>;
  /** Sorted class list (order-independent). Absent when none. */
  classes?: string[];
  /** Collapsed text content; present only for "#text" nodes. */
  text?: string;
}

/** Curated computed-style map keyed by CSS property name. */
export type StyleMap = Record<string, string>;

/** Geometry relative to the root element's top-left, in integer CSS px (dpr-independent). */
export interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** "top right bottom left" packed strings. */
  margin?: string;
  border?: string;
  padding?: string;
}

export interface VisualSnapshot {
  meta: SnapshotMeta;
  /** Flat, pre-order list (deterministic DOM order). */
  dom: DomNode[];
  /** Element nodes only (text nodes have no computed style). */
  styles: Record<NodeKey, StyleMap>;
  /** Element nodes only. */
  layout: Record<NodeKey, LayoutBox>;
  /**
   * Accessibility tree as Playwright's aria-snapshot YAML (role/name/state per line),
   * e.g. `- button "Message"`. Null if none. Diffed line-by-line.
   */
  a11y: string | null;
  /** Relative path (from project root) to the accompanying PNG. */
  screenshotPath?: string;
}
