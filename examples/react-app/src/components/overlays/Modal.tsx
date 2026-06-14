import { ui, text } from "../../ui/theme";

export type ModalProps = {
  open: boolean;
  size: "sm" | "md" | "lg";
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

const widths = { sm: 380, md: 480, lg: 560 };

export function Modal({
  open,
  size,
  title,
  description,
  confirmLabel,
  destructive = false,
}: ModalProps) {
  const heading = text(title, "Confirm action");
  const body = text(description, "Review the details below before continuing.");
  const action = text(confirmLabel, "Continue");

  if (!open) {
    return (
      <div
        style={{
          width: widths.sm,
          padding: "20px 24px",
          borderRadius: ui.radius.md,
          border: `1px dashed ${ui.colors.borderStrong}`,
          background: ui.colors.bgMuted,
          color: ui.colors.textMuted,
          fontFamily: ui.font,
          fontSize: 13,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        Modal is closed — toggle <strong style={{ color: ui.colors.text }}>open</strong> in props
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: widths[size],
        borderRadius: ui.radius.lg,
        overflow: "hidden",
        boxShadow: ui.shadow.lg,
        border: `1px solid ${ui.colors.border}`,
        background: ui.colors.bg,
        fontFamily: ui.font,
      }}
    >
      <div
        style={{
          padding: "22px 24px 8px",
          background: "linear-gradient(180deg, #ffffff 0%, #fafbff 100%)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: ui.colors.text,
            letterSpacing: "-0.02em",
          }}
        >
          {heading}
        </h2>
        <p
          style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: ui.colors.textMuted }}
        >
          {body}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          padding: "16px 24px 22px",
          background: ui.colors.bgMuted,
          borderTop: `1px solid ${ui.colors.border}`,
        }}
      >
        <button
          type="button"
          style={{
            padding: "9px 14px",
            borderRadius: ui.radius.sm,
            border: `1px solid ${ui.colors.border}`,
            background: ui.colors.bg,
            color: ui.colors.text,
            fontFamily: ui.font,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: ui.shadow.sm,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          style={{
            padding: "9px 16px",
            borderRadius: ui.radius.sm,
            border: "none",
            background: destructive ? ui.colors.danger : ui.colors.primary,
            color: "#fff",
            fontFamily: ui.font,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: destructive
              ? "0 1px 2px rgba(220, 38, 38, 0.28)"
              : "0 1px 2px rgba(79, 70, 229, 0.28)",
          }}
        >
          {action}
        </button>
      </div>
    </div>
  );
}
