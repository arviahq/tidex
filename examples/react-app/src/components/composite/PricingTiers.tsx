import { ui } from "../../ui/theme";

export interface PricingTier {
  name: string;
  price: number;
  period: "mo" | "yr";
  features: string[];
  featured: boolean;
}

export interface PricingTiersProps {
  tiers: PricingTier[];
  /** Currency symbol. */
  currency: string;
}

/** Responsive pricing grid — tiers auto-fit and stack on narrow viewports. */
export function PricingTiers({ tiers, currency }: PricingTiersProps) {
  const list = Array.isArray(tiers) ? tiers : [];
  const symbol = currency || "$";
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
        fontFamily: ui.font,
        boxSizing: "border-box",
        alignItems: "start",
      }}
    >
      {list.map((tier, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            padding: 22,
            borderRadius: ui.radius.lg,
            background: ui.colors.bg,
            border: `1px solid ${tier.featured ? ui.colors.primary : ui.colors.border}`,
            boxShadow: tier.featured ? ui.shadow.lg : ui.shadow.sm,
            outline: tier.featured
              ? `3px solid color-mix(in srgb, ${ui.colors.primary} 16%, transparent)`
              : undefined,
          }}
        >
          {tier.featured ? (
            <span
              style={{
                position: "absolute",
                top: -11,
                right: 18,
                padding: "3px 10px",
                borderRadius: ui.radius.full,
                background: ui.gradient.brand,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              POPULAR
            </span>
          ) : null}
          <div style={{ fontSize: 14, fontWeight: 700, color: ui.colors.text }}>{tier.name}</div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: ui.colors.textMuted }}>
              {symbol}
            </span>
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: ui.colors.text,
              }}
            >
              {tier.price}
            </span>
            <span style={{ fontSize: 13, color: ui.colors.textSoft }}>/{tier.period}</span>
          </div>
          <ul
            style={{
              listStyle: "none",
              margin: "16px 0 0",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {(tier.features ?? []).map((feat, j) => (
              <li
                key={j}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: ui.colors.textMuted,
                }}
              >
                <span style={{ color: ui.colors.success, fontWeight: 800 }}>✓</span>
                {feat}
              </li>
            ))}
          </ul>
          <button
            type="button"
            style={{
              marginTop: 18,
              width: "100%",
              padding: "10px 0",
              border: tier.featured ? "none" : `1px solid ${ui.colors.border}`,
              borderRadius: ui.radius.md,
              background: tier.featured ? ui.gradient.brand : ui.colors.bg,
              color: tier.featured ? "#fff" : ui.colors.text,
              fontFamily: ui.font,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Choose {tier.name}
          </button>
        </div>
      ))}
    </div>
  );
}
