import type { CSSProperties } from "react";

export const ui = {
  font: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  colors: {
    bg: "#ffffff",
    bgMuted: "#f8fafc",
    bgSubtle: "#f1f5f9",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    text: "#0f172a",
    textMuted: "#64748b",
    textSoft: "#94a3b8",
    primary: "#4f46e5",
    primarySoft: "#eef2ff",
    primaryStrong: "#4338ca",
    success: "#059669",
    successSoft: "#ecfdf5",
    warning: "#d97706",
    warningSoft: "#fffbeb",
    danger: "#dc2626",
    dangerSoft: "#fef2f2",
    info: "#2563eb",
    infoSoft: "#eff6ff",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  shadow: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    md: "0 8px 24px rgba(15, 23, 42, 0.08)",
    lg: "0 24px 48px rgba(15, 23, 42, 0.14)",
  },
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
