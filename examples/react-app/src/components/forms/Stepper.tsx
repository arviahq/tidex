import { ui } from "../../ui/theme";

// Exercises NUMBER props (value/min/max/step), a UNION (size), a BOOLEAN
// (disabled), and a callback that updates `value` (wire onChange → value).
export type StepperProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  size: "sm" | "md" | "lg";
  disabled?: boolean;
  onChange?: (value: number) => void;
};

const sizes = {
  sm: { pad: "4px 10px", font: 13, box: 28 },
  md: { pad: "6px 12px", font: 15, box: 34 },
  lg: { pad: "8px 14px", font: 17, box: 40 },
};

export function Stepper({ value, min, max, step, size, disabled = false, onChange }: StepperProps) {
  const s = sizes[size] ?? sizes.md;
  // Scanner defaults numbers to 0; fall back to a usable range so the demo
  // works out of the box before anyone touches the Props controls.
  const lo = Number.isFinite(min) ? min : 0;
  const hi = max || 10;
  const st = step || 1;
  const v = Number.isFinite(value) ? value : 0;

  const button = (label: string, next: number, enabled: boolean) => (
    <button
      type="button"
      disabled={disabled || !enabled}
      onClick={() => onChange?.(next)}
      style={{
        width: s.box,
        height: s.box,
        borderRadius: ui.radius.sm,
        border: `1px solid ${ui.colors.border}`,
        background: ui.colors.bg,
        color: ui.colors.text,
        fontSize: s.font,
        fontWeight: 600,
        cursor: disabled || !enabled ? "not-allowed" : "pointer",
        opacity: disabled || !enabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: ui.font,
        padding: s.pad,
        borderRadius: ui.radius.md,
        border: `1px solid ${ui.colors.border}`,
        background: ui.colors.bgMuted,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {button("−", Math.max(lo, v - st), v > lo)}
      <span
        style={{
          minWidth: 40,
          textAlign: "center",
          fontSize: s.font + 2,
          fontWeight: 700,
          color: ui.colors.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v}
      </span>
      {button("+", Math.min(hi, v + st), v < hi)}
    </div>
  );
}
