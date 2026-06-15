import { text, ui } from "../../ui/theme";

// Exercises BOOLEAN props (checked/disabled/indeterminate), a STRING (label),
// and a callback that updates `checked` (wire onCheckedChange → checked).
export type CheckboxProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Checkbox({
  label,
  checked,
  disabled = false,
  indeterminate = false,
  onCheckedChange,
}: CheckboxProps) {
  const active = checked || indeterminate;

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: ui.font,
        fontSize: 14,
        color: ui.colors.text,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        userSelect: "none",
      }}
    >
      <span
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 6,
          border: `1.5px solid ${active ? ui.colors.primary : ui.colors.borderStrong}`,
          background: active ? ui.colors.primary : ui.colors.bg,
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          transition: "background-color 120ms ease, border-color 120ms ease",
        }}
      >
        {indeterminate ? "–" : checked ? "✓" : ""}
      </span>
      <span>{text(label, "Accept terms")}</span>
    </label>
  );
}
