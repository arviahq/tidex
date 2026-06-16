import { ui } from "../../ui/theme";

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

export interface CardGridProps {
  cards: FeatureCard[];
  /** Minimum card width before the grid reflows to fewer columns. @min(140) @max(320) @step(10) @slider */
  minWidth: number;
  /** Gap between cards. @min(8) @max(32) @step(4) @slider */
  gap: number;
}

/**
 * Auto-fitting responsive card grid. `repeat(auto-fit, minmax(minWidth, 1fr))`
 * reflows columns to the available width with no media queries.
 */
export function CardGrid({ cards, minWidth, gap }: CardGridProps) {
  const list = Array.isArray(cards) ? cards : [];
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(120, minWidth)}px, 1fr))`,
        gap,
        fontFamily: ui.font,
        boxSizing: "border-box",
      }}
    >
      {list.map((card, i) => (
        <div
          key={i}
          style={{
            padding: 18,
            borderRadius: ui.radius.md,
            background: ui.colors.bg,
            border: `1px solid ${ui.colors.border}`,
            boxShadow: ui.shadow.sm,
            transition: "transform 150ms ease, box-shadow 150ms ease",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: ui.radius.sm,
              background: ui.colors.primarySoft,
              fontSize: 20,
            }}
          >
            {card.icon || "✨"}
          </div>
          <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: ui.colors.text }}>
            {card.title}
          </div>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              lineHeight: 1.55,
              color: ui.colors.textMuted,
            }}
          >
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
}
