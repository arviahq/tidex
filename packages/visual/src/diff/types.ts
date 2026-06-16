import type { NodeKey } from "../snapshot-types.js";

export type LayerKey = "screenshot" | "styles" | "dom" | "layout" | "a11y";

// ── DOM ──
export interface DomAttrChange {
  name: string;
  from?: string;
  to?: string;
}
export interface DomNodeChange {
  key: NodeKey;
  tag: string;
  /** Human selector (e.g. "span.badge"); attached by computeVisualDiff. */
  label?: string;
  attrs?: DomAttrChange[];
  classes?: { added: string[]; removed: string[] };
  text?: { from?: string; to?: string };
}
export interface DomDiff {
  added: { key: NodeKey; tag: string }[];
  removed: { key: NodeKey; tag: string }[];
  moved: { fromKey: NodeKey; toKey: NodeKey; tag: string }[];
  changed: DomNodeChange[];
}

// ── Styles ──
export interface StylePropChange {
  prop: string;
  from: string;
  to: string;
  isColor: boolean;
}
export interface StyleNodeChange {
  nodeKey: NodeKey;
  /** Human selector (e.g. "span.badge"); attached by computeVisualDiff. */
  label?: string;
  props: StylePropChange[];
}
export interface StyleDiff {
  nodes: StyleNodeChange[];
  totalProps: number;
}

// ── Layout ──
export interface LayoutNodeChange {
  nodeKey: NodeKey;
  /** Human selector (e.g. "span.badge"); attached by computeVisualDiff. */
  label?: string;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  phrase: string;
}
export interface LayoutDiff {
  nodes: LayoutNodeChange[];
  tolerancePx: number;
}

// ── A11y (aria-snapshot YAML lines) ──
export interface A11yChange {
  kind: "added" | "removed";
  line: string;
}
export interface A11yDiff {
  changes: A11yChange[];
}

// ── Summary / detail ──
export interface VisualLayerSummary {
  changed: boolean;
  /** Findings count; for screenshot it's pixelsChanged (-1 = size mismatch). */
  count: number;
}

export type VisualClassification = "identical" | "semantic" | "pixel-noise";

export interface VisualDiffSummary {
  layers: Record<LayerKey, VisualLayerSummary>;
  /** Any of dom/styles/layout/a11y changed. */
  semanticChanged: boolean;
  classification: VisualClassification;
  /** Human-readable headline. */
  verdict: string;
}

// ── Props (story args used for baseline vs current capture) ──
export interface PropChange {
  name: string;
  from?: unknown;
  to?: unknown;
}
export interface PropsDiff {
  changed: PropChange[];
}

/** Full per-layer detail — written to .tidex/reports/{id}-diff.json, fetched on demand. */
export interface VisualDiffDetail {
  storyId: string;
  summary: VisualDiffSummary;
  props: PropsDiff;
  dom: DomDiff;
  styles: StyleDiff;
  layout: LayoutDiff;
  a11y: A11yDiff;
}
