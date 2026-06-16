import { ui } from "../../ui/theme";

export type ProgressBarProps = {
  label: string;
  /** Completion percentage. @min(0) @max(100) @slider */
  value: number;
  tone: "primary" | "success" | "warning" | "danger";
  striped: boolean;
  showLabel: boolean;
};

export function ProgressBar({ label, value, tone, striped, showLabel }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const accent = ui.colors[tone];
  return (
    <div style={{ width: 320, fontFamily: ui.font, padding: 16 }}>
      {showLabel ? (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ui.colors.text }}>
            {label || "Uploading"}
          </span>
          <span style={{ fontSize: 13, color: ui.colors.textMuted }}>{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: ui.colors.bgSubtle,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: striped
              ? `repeating-linear-gradient(45deg, ${accent}, ${accent} 8px, color-mix(in srgb, ${accent} 70%, #000) 8px, color-mix(in srgb, ${accent} 70%, #000) 16px)`
              : accent,
            transition: "width 200ms ease",
          }}
        />
      </div>
    </div>
  );
}
