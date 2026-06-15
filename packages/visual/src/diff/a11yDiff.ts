import type { A11yChange, A11yDiff } from "./types.js";

function lineCounts(text: string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

/**
 * Multiset line diff over the aria-snapshot YAML. A changed role/name/state shows up
 * as one removed line + one added line — enough to catch a11y regressions that are
 * invisible in a screenshot (lost name, role flip, `[checked]`/`[expanded]` change).
 */
export function a11yDiff(base: string | null, cur: string | null): A11yDiff {
  const b = lineCounts(base);
  const c = lineCounts(cur);
  const changes: A11yChange[] = [];

  for (const [line, n] of c) {
    const was = b.get(line) ?? 0;
    for (let i = 0; i < n - was; i++) changes.push({ kind: "added", line });
  }
  for (const [line, n] of b) {
    const now = c.get(line) ?? 0;
    for (let i = 0; i < n - now; i++) changes.push({ kind: "removed", line });
  }

  return { changes };
}
