import type { NodeKey, StyleMap } from "../snapshot-types.js";
import type { StyleDiff, StyleNodeChange, StylePropChange } from "./types.js";

const COLOR_PROPS = new Set([
  "color",
  "background-color",
  "border-color",
  "outline-color",
  "fill",
  "stroke",
]);

function isSingleColor(v: string): boolean {
  const s = v.trim();
  return /^#[0-9a-f]{3,8}$/i.test(s) || /^rgba?\([^)]*\)$/i.test(s) || /^hsla?\([^)]*\)$/i.test(s);
}

/** A swatch is only meaningful when the whole value is a single color (not e.g. box-shadow). */
function isColorChange(prop: string, from: string, to: string): boolean {
  const named = COLOR_PROPS.has(prop) || prop.endsWith("-color");
  return named && isSingleColor(from) && isSingleColor(to);
}

export function styleDiff(
  base: Record<NodeKey, StyleMap>,
  cur: Record<NodeKey, StyleMap>,
): StyleDiff {
  const nodes: StyleNodeChange[] = [];
  let totalProps = 0;

  for (const key of Object.keys(base)) {
    const bs = base[key]!;
    const cs = cur[key];
    if (!cs) continue; // node absent in current → a DOM-layer concern, not a style change.
    const props: StylePropChange[] = [];
    for (const prop of Object.keys(bs)) {
      const from = bs[prop]!;
      const to = cs[prop];
      if (to !== undefined && from !== to) {
        props.push({ prop, from, to, isColor: isColorChange(prop, from, to) });
      }
    }
    if (props.length) {
      nodes.push({ nodeKey: key, props });
      totalProps += props.length;
    }
  }

  return { nodes, totalProps };
}
