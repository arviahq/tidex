import { ui } from "../../ui/theme";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectMenuProps {
  label: string;
  /** The available options. */
  options: SelectOption[];
  /** Currently selected option value. */
  value: string;
  placeholder: string;
  open: boolean;
}

export function SelectMenu({ label, options, value, placeholder, open }: SelectMenuProps) {
  const list = Array.isArray(options) ? options : [];
  const selected = list.find((o) => o.value === value);
  return (
    <div style={{ width: 260, fontFamily: ui.font, padding: 16 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: ui.colors.text,
          marginBottom: 8,
        }}
      >
        {label || "Assignee"}
      </span>
      <button
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "9px 12px",
          background: ui.colors.bg,
          border: `1px solid ${open ? ui.colors.primary : ui.colors.border}`,
          borderRadius: ui.radius.sm,
          color: selected ? ui.colors.text : ui.colors.textSoft,
          fontSize: 13,
          cursor: "pointer",
          boxShadow: open
            ? `0 0 0 3px color-mix(in srgb, ${ui.colors.primary} 18%, transparent)`
            : undefined,
        }}
      >
        {selected?.label ?? placeholder ?? "Select…"}
        <span style={{ color: ui.colors.textMuted }}>▾</span>
      </button>
      {open ? (
        <div
          style={{
            marginTop: 6,
            background: ui.colors.bg,
            border: `1px solid ${ui.colors.border}`,
            borderRadius: ui.radius.sm,
            boxShadow: ui.shadow.md,
            overflow: "hidden",
          }}
        >
          {list.map((opt) => (
            <div
              key={opt.value}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                color: opt.disabled ? ui.colors.textSoft : ui.colors.text,
                background: opt.value === value ? ui.colors.primarySoft : "transparent",
                opacity: opt.disabled ? 0.6 : 1,
                cursor: opt.disabled ? "not-allowed" : "pointer",
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
