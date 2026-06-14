import { text, ui } from "../../ui/theme";

export type StatCardProps = {
  label: string;
  value: string;
  change?: string;
  trend: "up" | "down" | "neutral";
  emphasis?: boolean;
};

const trendStyles = {
  up: { color: ui.colors.success, prefix: "↑" },
  down: { color: ui.colors.danger, prefix: "↓" },
  neutral: { color: ui.colors.textMuted, prefix: "→" },
};

export function StatCard({ label, value, change, trend, emphasis = false }: StatCardProps) {
  const trendStyle = trendStyles[trend] ?? trendStyles.neutral;

  return (
    <div
      style={{
        width: 240,
        padding: "18px 20px",
        borderRadius: ui.radius.md,
        border: emphasis ? "1px solid #c7d2fe" : `1px solid ${ui.colors.border}`,
        background: emphasis ? "linear-gradient(180deg, #eef2ff 0%, #ffffff 72%)" : ui.colors.bg,
        boxShadow: emphasis ? "0 10px 30px rgba(79, 70, 229, 0.1)" : ui.shadow.sm,
        fontFamily: ui.font,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: ui.colors.textMuted,
        }}
      >
        {text(label, "Monthly revenue")}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: ui.colors.text,
        }}
      >
        {text(value, "$12,480")}
      </div>
      <div
        style={{
          marginTop: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: ui.radius.full,
          background: ui.colors.bgMuted,
          fontSize: 12,
          fontWeight: 600,
          color: trendStyle.color,
        }}
      >
        <span aria-hidden="true">{trendStyle.prefix}</span>
        <span>{text(change, "+12.4%")}</span>
        <span style={{ color: ui.colors.textSoft, fontWeight: 500 }}>vs last period</span>
      </div>
    </div>
  );
}
