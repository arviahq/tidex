import type { CSSProperties } from "react";
// Side-effect import: injects the light/dark CSS variables the colors below
// reference, so every component that uses `ui` is theme-aware automatically.
import "./tokens";

// Colors point at CSS variables (with a light-mode fallback if the tokens
// aren't injected yet), so a single `data-theme` flip on <html> re-themes the
// whole component set without touching any component code.
export const ui = {
  font: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  colors: {
    bg: "var(--ui-bg, #ffffff)",
    bgMuted: "var(--ui-bg-muted, #f8fafc)",
    bgSubtle: "var(--ui-bg-subtle, #f1f5f9)",
    border: "var(--ui-border, #e2e8f0)",
    borderStrong: "var(--ui-border-strong, #cbd5e1)",
    text: "var(--ui-text, #0f172a)",
    textMuted: "var(--ui-text-muted, #64748b)",
    textSoft: "var(--ui-text-soft, #94a3b8)",
    primary: "var(--ui-primary, #4f46e5)",
    primarySoft: "var(--ui-primary-soft, #eef2ff)",
    primaryStrong: "var(--ui-primary-strong, #4338ca)",
    success: "var(--ui-success, #059669)",
    successSoft: "var(--ui-success-soft, #ecfdf5)",
    warning: "var(--ui-warning, #d97706)",
    warningSoft: "var(--ui-warning-soft, #fffbeb)",
    danger: "var(--ui-danger, #dc2626)",
    dangerSoft: "var(--ui-danger-soft, #fef2f2)",
    info: "var(--ui-info, #2563eb)",
    infoSoft: "var(--ui-info-soft, #eff6ff)",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  shadow: {
    sm: "var(--ui-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06))",
    md: "var(--ui-shadow-md, 0 8px 24px rgba(15, 23, 42, 0.08))",
    lg: "var(--ui-shadow-lg, 0 24px 48px rgba(15, 23, 42, 0.14))",
  },
  gradient: {
    brand: "linear-gradient(135deg, var(--ui-primary, #4f46e5), var(--ui-primary-strong, #4338ca))",
  },
  ring: "0 0 0 3px color-mix(in srgb, var(--ui-primary, #4f46e5) 22%, transparent)",
} as const;

export function text(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function initials(name: unknown): string {
  const safe = text(name, "BB");
  return (
    safe
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "BB"
  );
}

export function focusRing(color = ui.colors.primary): CSSProperties {
  return {
    outline: "none",
    boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)`,
  };
}
