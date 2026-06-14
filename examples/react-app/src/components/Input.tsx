import { ui, text } from "../ui/theme";

export type InputProps = {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
};

export function Input({ label, placeholder, disabled, value }: InputProps) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: ui.font,
        fontSize: 14,
        color: ui.colors.text,
        maxWidth: 320,
      }}
    >
      {label ? <span style={{ fontWeight: 600, fontSize: 13 }}>{text(label, "Label")}</span> : null}
      <input
        type="text"
        placeholder={text(placeholder, "Type something…")}
        disabled={disabled}
        defaultValue={value}
        style={{
          padding: "10px 12px",
          borderRadius: ui.radius.sm,
          border: `1px solid ${ui.colors.border}`,
          background: disabled ? ui.colors.bgMuted : ui.colors.bg,
          color: ui.colors.text,
          font: "inherit",
          boxShadow: ui.shadow.sm,
          opacity: disabled ? 0.65 : 1,
        }}
      />
    </label>
  );
}
