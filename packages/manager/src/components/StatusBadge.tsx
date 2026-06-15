import type { ReactNode } from "react";
import { Spinner } from "./Spinner";
import "./status-badge.css";

export type StatusKind = "info" | "pass" | "fail" | "warn";

export function StatusBadge({
  kind,
  wrap,
  children,
}: {
  kind: StatusKind;
  wrap?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={wrap ? "bb-status bb-status--wrap" : "bb-status"}
      data-kind={kind}
      role="status"
    >
      <StatusGlyph kind={kind} />
      <span className="bb-status__text">{children}</span>
    </span>
  );
}

function StatusGlyph({ kind }: { kind: StatusKind }) {
  if (kind === "info") return <Spinner />;
  if (kind === "pass") {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.5 8.5 6.5 11.5 12.5 4.75"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "warn") {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 2.5 14.5 13.5H1.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 6.4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.4" r="0.55" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.75 4.75 11.25 11.25M11.25 4.75 4.75 11.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
