import { ui } from "../../ui/theme";

export type RangeSliderProps = {
  label: string;
  /** Selected [min, max] range. */
  value: [number, number];
  /** Lower bound. @min(0) @max(100) */
  min: number;
  /** Upper bound. @min(0) @max(100) */
  max: number;
  tone: "primary" | "success" | "danger";
};

export function RangeSlider({ label, value, min, max, tone }: RangeSliderProps) {
  const lo = value?.[0] ?? min;
  const hi = value?.[1] ?? max;
  const span = Math.max(1, max - min);
  const leftPct = ((Math.min(lo, hi) - min) / span) * 100;
  const widthPct = (Math.abs(hi - lo) / span) * 100;
  const accent = ui.colors[tone];

  return (
    <div style={{ width: 300, fontFamily: ui.font, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: ui.colors.text }}>
          {label || "Price range"}
        </span>
        <span style={{ fontSize: 13, color: ui.colors.textMuted }}>
          {Math.min(lo, hi)} – {Math.max(lo, hi)}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 6,
          borderRadius: 999,
          background: ui.colors.bgSubtle,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            top: 0,
            bottom: 0,
            borderRadius: 999,
            background: accent,
          }}
        />
        {[leftPct, leftPct + widthPct].map((pos, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `calc(${pos}% - 8px)`,
              top: -5,
              width: 16,
              height: 16,
              borderRadius: 999,
              background: ui.colors.bg,
              border: `2px solid ${accent}`,
              boxShadow: ui.shadow.sm,
            }}
          />
        ))}
      </div>
    </div>
  );
}
