import type { DomNode, VisualSnapshot } from "../snapshot-types.js";
import { domDiff } from "./domDiff.js";
import { styleDiff } from "./styleDiff.js";
import { layoutDiff } from "./layoutDiff.js";
import { a11yDiff } from "./a11yDiff.js";
import type {
  A11yDiff,
  DomDiff,
  LayoutDiff,
  PropsDiff,
  StyleDiff,
  VisualDiffDetail,
  VisualDiffSummary,
} from "./types.js";

/** Diff the story args used for the baseline vs the current capture. */
function propsDiff(base: Record<string, unknown>, cur: Record<string, unknown>): PropsDiff {
  const names = [...new Set([...Object.keys(base), ...Object.keys(cur)])].sort();
  const changed = names
    .filter((name) => JSON.stringify(base[name]) !== JSON.stringify(cur[name]))
    .map((name) => ({ name, from: base[name], to: cur[name] }));
  return { changed };
}

interface SummarizeOptions {
  pixelsChanged: number;
  sizeMismatch?: boolean;
  /** Maps a node key to a short human selector (e.g. "span.badge"). */
  describe: (key: string) => string;
}

export function summarize(
  parts: { dom: DomDiff; styles: StyleDiff; layout: LayoutDiff; a11y: A11yDiff },
  opts: SummarizeOptions,
): VisualDiffSummary {
  const domCount =
    parts.dom.added.length +
    parts.dom.removed.length +
    parts.dom.moved.length +
    parts.dom.changed.length;
  const styleCount = parts.styles.totalProps;
  const layoutCount = parts.layout.nodes.length;
  const a11yCount = parts.a11y.changes.length;
  const screenshotChanged = opts.pixelsChanged > 0 || !!opts.sizeMismatch;

  const layers = {
    screenshot: {
      changed: screenshotChanged,
      count: opts.sizeMismatch ? -1 : opts.pixelsChanged,
    },
    styles: { changed: styleCount > 0, count: styleCount },
    dom: { changed: domCount > 0, count: domCount },
    layout: { changed: layoutCount > 0, count: layoutCount },
    a11y: { changed: a11yCount > 0, count: a11yCount },
  };

  const semanticChanged =
    layers.styles.changed || layers.dom.changed || layers.layout.changed || layers.a11y.changed;

  const classification: VisualDiffSummary["classification"] =
    !screenshotChanged && !semanticChanged
      ? "identical"
      : screenshotChanged && !semanticChanged
        ? "pixel-noise"
        : "semantic";

  const verdict = buildVerdict(classification, parts, {
    domCount,
    styleCount,
    layoutCount,
    a11yCount,
    pixelsChanged: opts.pixelsChanged,
    sizeMismatch: opts.sizeMismatch,
    describe: opts.describe,
  });

  return { layers, semanticChanged, classification, verdict };
}

function buildVerdict(
  classification: VisualDiffSummary["classification"],
  parts: { dom: DomDiff; styles: StyleDiff; layout: LayoutDiff; a11y: A11yDiff },
  ctx: {
    domCount: number;
    styleCount: number;
    layoutCount: number;
    a11yCount: number;
    pixelsChanged: number;
    sizeMismatch?: boolean;
    describe: (key: string) => string;
  },
): string {
  if (classification === "identical") return "No changes — current matches baseline.";

  if (classification === "pixel-noise") {
    if (ctx.sizeMismatch) {
      return "Screenshot size changed, but DOM, styles, layout and a11y are all identical.";
    }
    return `Pixel diff only (${ctx.pixelsChanged.toLocaleString()} px) — DOM, styles, layout and a11y all identical. Likely anti-aliasing noise.`;
  }

  // Single dominant style change reads best as a sentence.
  if (ctx.styleCount === 1 && ctx.domCount === 0 && ctx.layoutCount === 0 && ctx.a11yCount === 0) {
    const node = parts.styles.nodes[0]!;
    const change = node.props[0]!;
    return `1 style change: ${change.prop} ${change.from} → ${change.to} on ${ctx.describe(node.nodeKey)}; everything else identical.`;
  }
  if (ctx.layoutCount === 1 && ctx.styleCount === 0 && ctx.domCount === 0 && ctx.a11yCount === 0) {
    const node = parts.layout.nodes[0]!;
    return `1 layout change: ${ctx.describe(node.nodeKey)} ${node.phrase}; everything else identical.`;
  }

  const bits: string[] = [];
  if (ctx.styleCount) bits.push(`${ctx.styleCount} style`);
  if (ctx.domCount) bits.push(`${ctx.domCount} DOM`);
  if (ctx.layoutCount) bits.push(`${ctx.layoutCount} layout`);
  if (ctx.a11yCount) bits.push(`${ctx.a11yCount} a11y`);
  const total = ctx.styleCount + ctx.domCount + ctx.layoutCount + ctx.a11yCount;
  return `${bits.join(", ")} change${total === 1 ? "" : "s"}.`;
}

function describeNode(node: DomNode | undefined, key: string): string {
  if (!node) return key;
  if (node.tag === "#text") return "text";
  return node.classes?.length ? `${node.tag}.${node.classes[0]}` : node.tag;
}

/** Top-level: diff every layer between two snapshots and produce the full detail + summary. */
export function computeVisualDiff(
  base: VisualSnapshot,
  cur: VisualSnapshot,
  opts: { pixelsChanged: number; sizeMismatch?: boolean; tolerancePx?: number },
): VisualDiffDetail {
  const dom = domDiff(base.dom, cur.dom);
  const styles = styleDiff(base.styles, cur.styles);
  const layout = layoutDiff(base.layout, cur.layout, opts.tolerancePx ?? 1);
  const a11y = a11yDiff(base.a11y, cur.a11y);

  const domMap = new Map(cur.dom.map((n) => [n.key, n]));
  const describe = (key: string) => describeNode(domMap.get(key), key);

  // Attach human selectors so the manager can label nodes without the snapshot.
  for (const n of styles.nodes) n.label = describe(n.nodeKey);
  for (const n of layout.nodes) n.label = describe(n.nodeKey);
  for (const n of dom.changed) n.label = describe(n.key);

  const summary = summarize(
    { dom, styles, layout, a11y },
    { pixelsChanged: opts.pixelsChanged, sizeMismatch: opts.sizeMismatch, describe },
  );

  const props = propsDiff(base.meta.args ?? {}, cur.meta.args ?? {});

  return { storyId: cur.meta.componentId, summary, props, dom, styles, layout, a11y };
}
