import { ui, text } from "../ui/theme";

export type CardProps = {
  title?: string;
  elevated?: boolean;
  children?: React.ReactNode;
};

export function Card({ title, elevated, children }: CardProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: ui.radius.md,
        border: `1px solid ${ui.colors.border}`,
        boxShadow: elevated ? ui.shadow.md : ui.shadow.sm,
        background: ui.colors.bg,
        maxWidth: 360,
        fontFamily: ui.font,
      }}
    >
      {title ? (
        <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: ui.colors.text }}>
          {text(title, "Card title")}
        </h3>
      ) : null}
      <div style={{ fontSize: 14, lineHeight: 1.6, color: ui.colors.textMuted }}>
        {children ?? "Card content goes here with a little more breathing room."}
      </div>
    </div>
  );
}
