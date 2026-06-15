import type { DomNode } from "../snapshot-types.js";
import type { DomAttrChange, DomDiff, DomNodeChange } from "./types.js";

function indexByKey(nodes: DomNode[]): Map<string, DomNode> {
  const m = new Map<string, DomNode>();
  for (const n of nodes) m.set(n.key, n);
  return m;
}

/** Signature used to detect a node that moved (same identity, different position key). */
function signature(n: DomNode): string {
  const classes = (n.classes ?? []).slice().sort().join(".");
  return `${n.tag}|${classes}|${n.text ?? ""}`;
}

function diffAttrs(a: Record<string, string>, b: Record<string, string>): DomAttrChange[] {
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: DomAttrChange[] = [];
  for (const name of names) {
    if (a[name] !== b[name]) out.push({ name, from: a[name], to: b[name] });
  }
  return out;
}

function diffClasses(
  a: string[],
  b: string[],
): { added: string[]; removed: string[] } | undefined {
  const aSet = new Set(a);
  const bSet = new Set(b);
  const added = b.filter((c) => !aSet.has(c));
  const removed = a.filter((c) => !bSet.has(c));
  return added.length || removed.length ? { added, removed } : undefined;
}

export function domDiff(base: DomNode[], cur: DomNode[]): DomDiff {
  const b = indexByKey(base);
  const c = indexByKey(cur);

  const changed: DomNodeChange[] = [];
  const tagChangedRemoved: { key: string; tag: string }[] = [];
  const tagChangedAdded: { key: string; tag: string }[] = [];

  // Same-key comparison (attrs/classes/text). A tag change is reported as remove+add.
  for (const [key, bn] of b) {
    const cn = c.get(key);
    if (!cn) continue;
    if (bn.tag !== cn.tag) {
      tagChangedRemoved.push({ key, tag: bn.tag });
      tagChangedAdded.push({ key, tag: cn.tag });
      continue;
    }
    const change: DomNodeChange = { key, tag: bn.tag };
    const attrs = diffAttrs(bn.attrs ?? {}, cn.attrs ?? {});
    if (attrs.length) change.attrs = attrs;
    const classes = diffClasses(bn.classes ?? [], cn.classes ?? []);
    if (classes) change.classes = classes;
    if ((bn.text ?? "") !== (cn.text ?? "")) change.text = { from: bn.text, to: cn.text };
    if (change.attrs || change.classes || change.text) changed.push(change);
  }

  const addedKeys = [...c.keys()].filter((k) => !b.has(k));
  const removedKeys = [...b.keys()].filter((k) => !c.has(k));

  // Match removed↔added by signature → "moved" (mitigates positional-key churn).
  const removedBySig = new Map<string, string[]>();
  for (const k of removedKeys) {
    const s = signature(b.get(k)!);
    const list = removedBySig.get(s);
    if (list) list.push(k);
    else removedBySig.set(s, [k]);
  }
  const moved: DomDiff["moved"] = [];
  const remainingAdded = new Set(addedKeys);
  const remainingRemoved = new Set(removedKeys);
  for (const ak of addedKeys) {
    const s = signature(c.get(ak)!);
    const list = removedBySig.get(s);
    if (list && list.length) {
      const rk = list.shift()!;
      moved.push({ fromKey: rk, toKey: ak, tag: c.get(ak)!.tag });
      remainingAdded.delete(ak);
      remainingRemoved.delete(rk);
    }
  }

  const added = [
    ...[...remainingAdded].map((k) => ({ key: k, tag: c.get(k)!.tag })),
    ...tagChangedAdded,
  ];
  const removed = [
    ...[...remainingRemoved].map((k) => ({ key: k, tag: b.get(k)!.tag })),
    ...tagChangedRemoved,
  ];

  return { added, removed, moved, changed };
}
