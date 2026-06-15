import type { A11yDiff, DomDiff, LayoutDiff, StyleDiff } from "../api";

function ColorSwatch({ value }: { value: string }) {
  return (
    <span className="bb-vdiff__swatch-wrap">
      <span className="bb-vdiff__swatch" style={{ background: value }} aria-hidden="true" />
      <span className="bb-vdiff__mono">{value}</span>
    </span>
  );
}

function EmptyLayer({ text }: { text: string }) {
  return <p className="bb-vdiff__empty">{text}</p>;
}

export function StyleDiffView({ diff }: { diff: StyleDiff }) {
  if (diff.nodes.length === 0) return <EmptyLayer text="No style changes." />;
  return (
    <div className="bb-vdiff">
      {diff.nodes.map((node) => (
        <div key={node.nodeKey} className="bb-vdiff__group">
          <div className="bb-vdiff__group-head">
            <span className="bb-vdiff__sel">{node.label ?? node.nodeKey}</span>
            <span className="bb-vdiff__count">{node.props.length}</span>
          </div>
          <ul className="bb-vdiff__rows">
            {node.props.map((p) => (
              <li key={p.prop} className="bb-vdiff__row">
                <span className="bb-vdiff__prop">{p.prop}</span>
                {p.isColor ? <ColorSwatch value={p.from} /> : <span className="bb-vdiff__mono bb-vdiff__from">{p.from}</span>}
                <span className="bb-vdiff__arrow" aria-hidden="true">→</span>
                {p.isColor ? <ColorSwatch value={p.to} /> : <span className="bb-vdiff__mono bb-vdiff__to">{p.to}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function DomDiffView({ diff }: { diff: DomDiff }) {
  const total =
    diff.added.length + diff.removed.length + diff.moved.length + diff.changed.length;
  if (total === 0) return <EmptyLayer text="No DOM changes." />;
  return (
    <div className="bb-vdiff">
      {diff.changed.map((c) => (
        <div key={`c-${c.key}`} className="bb-vdiff__group">
          <div className="bb-vdiff__group-head">
            <span className="bb-vdiff__dot" data-kind="changed" aria-hidden="true" />
            <span className="bb-vdiff__sel">{c.label ?? c.tag}</span>
          </div>
          <ul className="bb-vdiff__rows">
            {c.text && (
              <li className="bb-vdiff__row">
                <span className="bb-vdiff__prop">text</span>
                <span className="bb-vdiff__mono bb-vdiff__from">{c.text.from ?? "∅"}</span>
                <span className="bb-vdiff__arrow" aria-hidden="true">→</span>
                <span className="bb-vdiff__mono bb-vdiff__to">{c.text.to ?? "∅"}</span>
              </li>
            )}
            {c.classes && (c.classes.added.length > 0 || c.classes.removed.length > 0) && (
              <li className="bb-vdiff__row">
                <span className="bb-vdiff__prop">class</span>
                <span className="bb-vdiff__mono">
                  {c.classes.removed.map((cl) => (
                    <span key={cl} className="bb-vdiff__chip" data-kind="removed">−{cl}</span>
                  ))}
                  {c.classes.added.map((cl) => (
                    <span key={cl} className="bb-vdiff__chip" data-kind="added">+{cl}</span>
                  ))}
                </span>
              </li>
            )}
            {c.attrs?.map((a) => (
              <li key={a.name} className="bb-vdiff__row">
                <span className="bb-vdiff__prop">{a.name}</span>
                <span className="bb-vdiff__mono bb-vdiff__from">{a.from ?? "∅"}</span>
                <span className="bb-vdiff__arrow" aria-hidden="true">→</span>
                <span className="bb-vdiff__mono bb-vdiff__to">{a.to ?? "∅"}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {(diff.added.length > 0 || diff.removed.length > 0 || diff.moved.length > 0) && (
        <ul className="bb-vdiff__rows bb-vdiff__rows--flat">
          {diff.removed.map((n) => (
            <li key={`r-${n.key}`} className="bb-vdiff__row">
              <span className="bb-vdiff__dot" data-kind="removed" aria-hidden="true" />
              <span className="bb-vdiff__mono">removed &lt;{n.tag}&gt;</span>
              <span className="bb-vdiff__key">{n.key}</span>
            </li>
          ))}
          {diff.added.map((n) => (
            <li key={`a-${n.key}`} className="bb-vdiff__row">
              <span className="bb-vdiff__dot" data-kind="added" aria-hidden="true" />
              <span className="bb-vdiff__mono">added &lt;{n.tag}&gt;</span>
              <span className="bb-vdiff__key">{n.key}</span>
            </li>
          ))}
          {diff.moved.map((n) => (
            <li key={`m-${n.fromKey}`} className="bb-vdiff__row">
              <span className="bb-vdiff__dot" data-kind="moved" aria-hidden="true" />
              <span className="bb-vdiff__mono">moved &lt;{n.tag}&gt;</span>
              <span className="bb-vdiff__key">{n.fromKey} → {n.toKey}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LayoutDiffView({ diff }: { diff: LayoutDiff }) {
  if (diff.nodes.length === 0) return <EmptyLayer text="No layout changes." />;
  return (
    <ul className="bb-vdiff__rows bb-vdiff__rows--flat">
      {diff.nodes.map((n) => (
        <li key={n.nodeKey} className="bb-vdiff__row bb-vdiff__row--layout">
          <span className="bb-vdiff__sel">{n.label ?? n.nodeKey}</span>
          <span className="bb-vdiff__phrase">{n.phrase}</span>
        </li>
      ))}
    </ul>
  );
}

export function A11yDiffView({ diff }: { diff: A11yDiff }) {
  if (diff.changes.length === 0) return <EmptyLayer text="No accessibility changes." />;
  return (
    <ul className="bb-vdiff__a11y">
      {diff.changes.map((c, i) => (
        <li key={i} className="bb-vdiff__a11y-line" data-kind={c.kind}>
          <span className="bb-vdiff__a11y-sign" aria-hidden="true">{c.kind === "added" ? "+" : "−"}</span>
          <span className="bb-vdiff__mono">{c.line}</span>
        </li>
      ))}
    </ul>
  );
}
