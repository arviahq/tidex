import { ui, text } from "../../ui/theme";

export interface EmptyStateAction {
  label: string;
  href: string;
}

export interface EmptyStateProps {
  icon: "inbox" | "search" | "folder" | "spark";
  title: string;
  /** Supporting copy. @multiline @maxLength(160) */
  description: string;
  /** Primary call to action. */
  action: EmptyStateAction;
}

const GLYPH = { inbox: "📥", search: "🔍", folder: "📁", spark: "✨" } as const;

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        width: 340,
        padding: 32,
        textAlign: "center",
        background: ui.colors.bg,
        border: `1px dashed ${ui.colors.borderStrong}`,
        borderRadius: ui.radius.lg,
        fontFamily: ui.font,
      }}
    >
      <div style={{ fontSize: 40, lineHeight: 1 }}>{GLYPH[icon]}</div>
      <div style={{ marginTop: 14, fontSize: 16, fontWeight: 700, color: ui.colors.text }}>
        {text(title, "Nothing here yet")}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: ui.colors.textMuted, lineHeight: 1.5 }}>
        {text(description, "Create your first item to get started.")}
      </div>
      {action?.label ? (
        <button
          type="button"
          style={{
            marginTop: 18,
            padding: "9px 18px",
            border: "none",
            borderRadius: ui.radius.sm,
            background: ui.colors.primary,
            color: "#fff",
            fontFamily: ui.font,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
