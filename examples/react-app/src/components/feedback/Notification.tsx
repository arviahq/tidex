import { ui, text, initials } from "../../ui/theme";

/** Leading media — a glyph icon or a person's avatar. Discriminated by `type`. */
export type NotificationMedia = { type: "icon"; glyph: string } | { type: "avatar"; name: string };

export type NotificationProps = {
  title: string;
  /** Body text. @multiline @maxLength(200) */
  message: string;
  tone: "info" | "success" | "warning" | "danger";
  /** Leading media variant. */
  media: NotificationMedia;
  dismissible: boolean;
};

const TONE_SOFT = {
  info: ui.colors.infoSoft,
  success: ui.colors.successSoft,
  warning: ui.colors.warningSoft,
  danger: ui.colors.dangerSoft,
} as const;

const TONE = {
  info: ui.colors.info,
  success: ui.colors.success,
  warning: ui.colors.warning,
  danger: ui.colors.danger,
} as const;

export function Notification({ title, message, tone, media, dismissible }: NotificationProps) {
  const accent = TONE[tone];
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        width: 360,
        padding: 14,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: ui.radius.md,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: media?.type === "avatar" ? 999 : ui.radius.sm,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: TONE_SOFT[tone],
          color: accent,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {media?.type === "avatar" ? initials(media.name) : (media?.glyph ?? "🔔")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: ui.colors.text }}>
          {text(title, "Heads up")}
        </div>
        <div style={{ marginTop: 2, fontSize: 13, color: ui.colors.textMuted, lineHeight: 1.5 }}>
          {text(message, "Your changes have been saved.")}
        </div>
      </div>
      {dismissible ? <span style={{ color: ui.colors.textSoft, cursor: "pointer" }}>×</span> : null}
    </div>
  );
}
