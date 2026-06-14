import { text, ui } from "../../ui/theme";

export type AlertProps = {
  variant: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  dismissible?: boolean;
};

const styles = {
  info: { soft: ui.colors.infoSoft, border: "#bfdbfe", accent: ui.colors.info },
  success: { soft: ui.colors.successSoft, border: "#bbf7d0", accent: ui.colors.success },
  warning: { soft: ui.colors.warningSoft, border: "#fde68a", accent: ui.colors.warning },
  error: { soft: ui.colors.dangerSoft, border: "#fecaca", accent: ui.colors.danger },
};

function AlertIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
      <path d="M8 4.5v4.25M8 10.75h.01" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function Alert({ variant, title, message, dismissible = false }: AlertProps) {
  const tone = styles[variant] ?? styles.info;
  const heading = text(title, "Heads up");
  const body = text(message, "Something happened that you should know about.");

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        maxWidth: 440,
        padding: "16px 18px",
        borderRadius: ui.radius.md,
        border: `1px solid ${tone.border}`,
        background: tone.soft,
        fontFamily: ui.font,
        boxShadow: ui.shadow.sm,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: ui.radius.full,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          boxShadow: ui.shadow.sm,
        }}
      >
        <AlertIcon color={tone.accent} />
      </span>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: ui.colors.text }}>{heading}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55, color: ui.colors.textMuted }}>{body}</div>
      </div>
      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: ui.radius.full,
            border: "none",
            background: "rgba(255,255,255,0.8)",
            color: ui.colors.textMuted,
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
