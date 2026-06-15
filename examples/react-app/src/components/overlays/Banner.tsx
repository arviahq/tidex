import { text, ui } from "../../ui/theme";

// Exercises an OBJECT prop (`action` is an inline object literal → object
// control / JSON textarea), plus STRING/UNION/BOOLEAN and an action-only
// callback (`onDismiss` has no obvious state to update — leave it action-only).
export type BannerProps = {
  message: string;
  action: { label: string; href: string };
  tone: "info" | "success" | "warning" | "error";
  dismissible?: boolean;
  onDismiss?: () => void;
};

const tones = {
  info: { soft: ui.colors.infoSoft, accent: ui.colors.info },
  success: { soft: ui.colors.successSoft, accent: ui.colors.success },
  warning: { soft: ui.colors.warningSoft, accent: ui.colors.warning },
  error: { soft: ui.colors.dangerSoft, accent: ui.colors.danger },
};

export function Banner({ message, action, tone, dismissible = false, onDismiss }: BannerProps) {
  const palette = tones[tone] ?? tones.info;
  const label = text(action?.label, "View details");
  const href = text(action?.href, "#");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: 460,
        padding: "12px 16px",
        borderRadius: ui.radius.md,
        background: palette.soft,
        border: `1px solid color-mix(in srgb, ${palette.accent} 30%, ${ui.colors.border})`,
        fontFamily: ui.font,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: "50%", background: palette.accent }}
      />
      <span style={{ flex: 1, fontSize: 14, color: ui.colors.text }}>
        {text(message, "Your changes have been saved.")}
      </span>
      <a
        href={href}
        style={{ fontSize: 13, fontWeight: 600, color: palette.accent, textDecoration: "none" }}
      >
        {label}
      </a>
      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss?.()}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            color: ui.colors.textMuted,
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
