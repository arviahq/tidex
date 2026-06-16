import { ui } from "../../ui/theme";

export interface LegendMapProps {
  title: string;
  /** Label → color value (hex). Edited as key/value entries. */
  entries: Map<string, string>;
  layout: "list" | "inline";
}

export function LegendMap({ title, entries, layout }: LegendMapProps) {
  const pairs = [...(entries instanceof Map ? entries : new Map<string, string>())];
  const inline = layout === "inline";
  return (
    <div
      style={{
        width: inline ? 360 : 220,
        padding: 16,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        borderRadius: ui.radius.md,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: ui.colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        {title || "Legend"}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: inline ? "row" : "column",
          flexWrap: "wrap",
          gap: inline ? 14 : 8,
        }}
      >
        {pairs.map(([label, color], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: typeof color === "string" ? color : ui.colors.border,
                border: `1px solid ${ui.colors.border}`,
              }}
            />
            <span style={{ fontSize: 13, color: ui.colors.text }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
