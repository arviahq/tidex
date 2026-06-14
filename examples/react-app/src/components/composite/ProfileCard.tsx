import { text, ui } from "../../ui/theme";
import { Avatar } from "../media/Avatar";
import { Badge } from "../Badge";

export type ProfileCardProps = {
  name: string;
  role: string;
  avatarSize: "sm" | "md" | "lg";
  status: "online" | "away" | "offline";
  verified?: boolean;
  layout: "horizontal" | "vertical";
};

export function ProfileCard({
  name,
  role,
  avatarSize,
  status,
  verified = false,
  layout,
}: ProfileCardProps) {
  const displayName = text(name, "Jane Cooper");
  const displayRole = text(role, "Product Designer");
  const isVertical = layout === "vertical";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        alignItems: isVertical ? "center" : "flex-start",
        gap: isVertical ? 14 : 16,
        width: isVertical ? 260 : 360,
        padding: 18,
        borderRadius: ui.radius.md,
        border: `1px solid ${ui.colors.border}`,
        background: ui.colors.bg,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
        textAlign: isVertical ? "center" : "left",
      }}
    >
      <Avatar name={displayName} size={avatarSize} shape="circle" status={status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isVertical ? "center" : "flex-start",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: ui.colors.text, letterSpacing: "-0.02em" }}>
            {displayName}
          </span>
          {verified ? <Badge tone="info">Verified</Badge> : null}
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: ui.colors.textMuted }}>{displayRole}</div>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 8,
            justifyContent: isVertical ? "center" : "flex-start",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={{
              padding: "8px 14px",
              borderRadius: ui.radius.sm,
              border: "none",
              background: ui.colors.primary,
              color: "#fff",
              fontFamily: ui.font,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(79, 70, 229, 0.28)",
            }}
          >
            Message
          </button>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              borderRadius: ui.radius.sm,
              border: `1px solid ${ui.colors.border}`,
              background: ui.colors.bg,
              color: ui.colors.text,
              fontFamily: ui.font,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View profile
          </button>
        </div>
      </div>
    </div>
  );
}
