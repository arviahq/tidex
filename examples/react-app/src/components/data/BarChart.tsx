import { ui } from "../../ui/theme";

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Bar fill color. @color */
  barColor: string;
  /** Chart height in px. @min(120) @max(320) @step(10) @slider */
  height: number;
  showValues: boolean;
}

export function BarChart({ data, barColor, height, showValues }: BarChartProps) {
  const series = Array.isArray(data) ? data : [];
  const max = Math.max(1, ...series.map((d) => d.value || 0));
  const fill = barColor || ui.colors.primary;
  return (
    <div
      style={{
        width: 360,
        padding: 16,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        borderRadius: ui.radius.md,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height }}>
        {series.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            {showValues ? (
              <span style={{ fontSize: 11, color: ui.colors.textMuted }}>{d.value}</span>
            ) : null}
            <div
              style={{
                width: "100%",
                height: `${((d.value || 0) / max) * 100}%`,
                minHeight: 2,
                background: fill,
                borderRadius: "6px 6px 0 0",
              }}
            />
            <span style={{ fontSize: 11, color: ui.colors.textSoft, whiteSpace: "nowrap" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
