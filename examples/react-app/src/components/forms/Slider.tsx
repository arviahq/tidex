import { text, ui } from "../../ui/theme";

// Exercises a FUNCTION-TYPED prop that is NOT named `on*` (`format`): the
// scanner detects it as a callback via its `=>` type, so it shows up in the
// Interactions tab too. Formatters are inputs, not events, so the component
// defaults it defensively. Also covers NUMBER props + an `onChange → value`
// callback.
export type SliderProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  format: (value: number) => string;
  onChange?: (value: number) => void;
};

export function Slider({ value, min, max, step, label, format, onChange }: SliderProps) {
  const lo = Number.isFinite(min) ? min : 0;
  const hi = max || 100;
  const st = step || 1;
  const v = Number.isFinite(value) ? value : Math.round((lo + hi) / 2);
  const fmt = typeof format === "function" ? format : (n: number) => String(n);
  const pct = hi === lo ? 0 : ((v - lo) / (hi - lo)) * 100;

  return (
    <label style={{ display: "block", width: 280, fontFamily: ui.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: ui.colors.text }}>
          {text(label, "Opacity")}
        </span>
        <span
          style={{ fontSize: 13, color: ui.colors.textMuted, fontVariantNumeric: "tabular-nums" }}
        >
          {fmt(v)}
        </span>
      </div>
      <input
        type="range"
        min={lo}
        max={hi}
        step={st}
        value={v}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={{ width: "100%", accentColor: ui.colors.primary }}
      />
      <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: ui.colors.bgSubtle }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 2,
            background: ui.colors.primary,
          }}
        />
      </div>
    </label>
  );
}
