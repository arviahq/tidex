import { ui } from "../../ui/theme";

export interface Stat {
  label: string;
  value: string;
  /** Percentage change; negative shows a downward trend. */
  delta: number;
}

export interface StatRowProps {
  stats: Stat[];
}

/** Responsive KPI row — cards auto-fit and wrap to the available width. */
export function StatRow({ stats }: StatRowProps) {
  const list = Array.isArray(stats) ? stats : [];
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 14,
        fontFamily: ui.font,
        boxSizing: "border-box",
      }}
    >
      {list.map((stat, i) => {
        const up = (stat.delta ?? 0) >= 0;
        return (
          <div
            key={i}
            style={{
              padding: 16,
              borderRadius: ui.radius.md,
              background: ui.colors.bg,
              border: `1px solid ${ui.colors.border}`,
              boxShadow: ui.shadow.sm,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: ui.colors.textSoft,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: ui.colors.text,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                color: up ? ui.colors.success : ui.colors.danger,
              }}
            >
              <span>{up ? "▲" : "▼"}</span>
              {Math.abs(stat.delta ?? 0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
