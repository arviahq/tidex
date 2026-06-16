import { useState } from "react";
import type { ScanReport } from "../api";
import "./scan-diagnostics.css";

const UNRESOLVED_MARKER = "imported/unresolved prop types";

type UnresolvedEntry = ScanReport["componentsWithUnknownProps"][number];

export function ScanDiagnostics({ report }: { report: ScanReport }) {
  const unresolved = report.componentsWithUnknownProps ?? [];
  // The unresolved-types summary string is replaced by the richer card below.
  const otherWarnings = (report.warnings ?? []).filter((w) => !w.includes(UNRESOLVED_MARKER));

  if (unresolved.length === 0 && otherWarnings.length === 0) return null;

  return (
    <div className="bb-diag" role="status">
      {otherWarnings.map((warning) => (
        <p key={warning} className="bb-diag__warning">
          {warning}
        </p>
      ))}
      {unresolved.length > 0 ? <UnresolvedTypes entries={unresolved} /> : null}
    </div>
  );
}

function UnresolvedTypes({ entries }: { entries: UnresolvedEntry[] }) {
  const [open, setOpen] = useState(false);
  const totalProps = entries.reduce((sum, e) => sum + e.unknownCount, 0);

  return (
    <div className="bb-diag__card">
      <button
        type="button"
        className="bb-diag__head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="bb-diag__chevron" data-open={open || undefined} aria-hidden="true">
          ›
        </span>
        <span className="bb-diag__title">Unresolved prop types</span>
        <span className="bb-diag__badge">
          {entries.length} {entries.length === 1 ? "component" : "components"} · {totalProps}{" "}
          {totalProps === 1 ? "prop" : "props"}
        </span>
      </button>

      {open ? (
        <div className="bb-diag__body">
          <p className="bb-diag__hint">
            These props reference types Tidex couldn&apos;t resolve — usually a type imported from
            another module. Move the type into the component file (or a local types module) so its
            controls appear.
          </p>
          <ul className="bb-diag__list">
            {entries.map((entry) => (
              <li key={entry.id} className="bb-diag__item">
                <code className="bb-diag__component">{entry.id}</code>
                <span className="bb-diag__props">
                  {entry.props.map((prop) => (
                    <span key={prop.name} className="bb-diag__prop">
                      <span className="bb-diag__prop-name">{prop.name}</span>
                      {prop.typeText ? (
                        <span className="bb-diag__prop-type">: {prop.typeText}</span>
                      ) : null}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
