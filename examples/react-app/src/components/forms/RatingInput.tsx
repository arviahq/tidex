import { ui } from "../../ui/theme";

export type RatingInputProps = {
  /** Current rating. @min(0) @max(5) @step(0.5) @slider */
  value: number;
  /** Number of symbols. @min(3) @max(10) */
  count: number;
  icon: "star" | "heart" | "circle";
  /** Symbol color. @color */
  color: string;
  readonly: boolean;
};

const GLYPH = { star: "★", heart: "♥", circle: "●" } as const;

export function RatingInput({ value, count, icon, color, readonly }: RatingInputProps) {
  const total = Math.max(3, Math.min(10, Math.round(count)));
  const fill = color || ui.colors.warning;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: ui.font,
        padding: 16,
      }}
    >
      <div style={{ display: "inline-flex", gap: 4, fontSize: 24, lineHeight: 1 }}>
        {Array.from({ length: total }).map((_, i) => {
          const active = i + 1 <= Math.round(value);
          return (
            <span
              key={i}
              style={{
                color: active ? fill : ui.colors.borderStrong,
                cursor: readonly ? "default" : "pointer",
              }}
            >
              {GLYPH[icon]}
            </span>
          );
        })}
      </div>
      <span style={{ fontSize: 13, color: ui.colors.textMuted }}>{value.toFixed(1)}</span>
    </div>
  );
}
