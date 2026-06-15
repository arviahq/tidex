import type { LayoutBox, NodeKey } from "../snapshot-types.js";
import type { LayoutDiff, LayoutNodeChange } from "./types.js";

function phraseFor(dx: number, dy: number, dw: number, dh: number): string {
  const parts: string[] = [];
  if (dx) parts.push(`moved ${Math.abs(dx)}px ${dx > 0 ? "right" : "left"}`);
  if (dy) parts.push(`moved ${Math.abs(dy)}px ${dy > 0 ? "down" : "up"}`);
  if (dw) parts.push(`${dw > 0 ? "grew" : "shrank"} ${Math.abs(dw)}px wide`);
  if (dh) parts.push(`${dh > 0 ? "grew" : "shrank"} ${Math.abs(dh)}px tall`);
  return parts.join(", ");
}

export function layoutDiff(
  base: Record<NodeKey, LayoutBox>,
  cur: Record<NodeKey, LayoutBox>,
  tolerancePx = 1,
): LayoutDiff {
  const nodes: LayoutNodeChange[] = [];
  for (const key of Object.keys(base)) {
    const b = base[key]!;
    const c = cur[key];
    if (!c) continue;
    const dx = c.x - b.x;
    const dy = c.y - b.y;
    const dw = c.w - b.w;
    const dh = c.h - b.h;
    if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw), Math.abs(dh)) <= tolerancePx) continue;
    nodes.push({ nodeKey: key, dx, dy, dw, dh, phrase: phraseFor(dx, dy, dw, dh) });
  }
  return { nodes, tolerancePx };
}
