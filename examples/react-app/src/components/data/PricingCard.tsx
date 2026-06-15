import { text, ui } from "../../ui/theme";

// Exercises a NESTED OBJECT prop: `plan` is an object literal containing mixed
// primitives (string/number/boolean), so the object control recurses one level
// deep. Plus a STRING and a BOOLEAN.
export type PricingCardProps = {
  plan: { name: string; price: number; featured: boolean };
  cta: string;
  highlighted: boolean;
};

export function PricingCard({ plan, cta, highlighted }: PricingCardProps) {
  const name = text(plan?.name, "Pro");
  const price = Number.isFinite(plan?.price) ? plan.price : 24;
  const featured = Boolean(plan?.featured);

  return (
    <div
      style={{
        width: 240,
        padding: "22px 22px 24px",
        borderRadius: ui.radius.lg,
        fontFamily: ui.font,
        background: highlighted ? "linear-gradient(180deg,#eef2ff 0%,#ffffff 70%)" : ui.colors.bg,
        border: `1px solid ${highlighted ? "#c7d2fe" : ui.colors.border}`,
        boxShadow: highlighted ? "0 14px 36px rgba(79,70,229,0.14)" : ui.shadow.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: ui.colors.text }}>{name}</span>
        {featured ? (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: ui.radius.full,
              fontSize: 11,
              fontWeight: 700,
              background: ui.colors.primarySoft,
              color: ui.colors.primaryStrong,
            }}
          >
            Popular
          </span>
        ) : null}
      </div>
      <div style={{ margin: "12px 0 18px", display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: ui.colors.text }}>${price}</span>
        <span style={{ fontSize: 13, color: ui.colors.textMuted }}>/mo</span>
      </div>
      <button
        type="button"
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: ui.radius.sm,
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          background: ui.colors.primary,
          color: "#fff",
        }}
      >
        {text(cta, "Choose plan")}
      </button>
    </div>
  );
}
