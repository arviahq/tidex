import { ui, initials } from "../../ui/theme";

/** A feed entry — either a text post or a photo. Discriminated by `type`. */
export type FeedItem =
  | { type: "post"; author: string; body: string }
  | { type: "photo"; author: string; caption: string; color: string };

export interface FeedProps {
  items: FeedItem[];
}

export function Feed({ items }: FeedProps) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div
      style={{ width: 360, display: "flex", flexDirection: "column", gap: 12, fontFamily: ui.font }}
    >
      {list.map((item, i) => (
        <div
          key={i}
          style={{
            padding: 14,
            background: ui.colors.bg,
            border: `1px solid ${ui.colors.border}`,
            borderRadius: ui.radius.md,
            boxShadow: ui.shadow.sm,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: ui.colors.primarySoft,
                color: ui.colors.primaryStrong,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {initials(item.author)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: ui.colors.text }}>
              {item.author}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: ui.colors.textSoft,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {item.type}
            </span>
          </div>
          {item.type === "post" ? (
            <p style={{ margin: 0, fontSize: 14, color: ui.colors.text, lineHeight: 1.5 }}>
              {item.body}
            </p>
          ) : (
            <div>
              <div
                style={{
                  height: 120,
                  borderRadius: ui.radius.sm,
                  background: item.color || ui.colors.bgSubtle,
                }}
              />
              <p style={{ margin: "8px 0 0", fontSize: 13, color: ui.colors.textMuted }}>
                {item.caption}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
