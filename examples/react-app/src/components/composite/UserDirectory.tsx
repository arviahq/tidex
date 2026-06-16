import { ui, initials } from "../../ui/theme";

export interface DirectoryUser {
  name: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
}

export interface UserDirectoryProps {
  title: string;
  /** Users keyed by username — edited via the entity explorer. */
  users: Record<string, DirectoryUser>;
}

const ROLE_TONE = {
  admin: ui.colors.primary,
  editor: ui.colors.info,
  viewer: ui.colors.textMuted,
} as const;

export function UserDirectory({ title, users }: UserDirectoryProps) {
  const entries = Object.entries(users && typeof users === "object" ? users : {});
  return (
    <div
      style={{
        width: 340,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        borderRadius: ui.radius.md,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${ui.colors.border}`,
          fontSize: 14,
          fontWeight: 700,
          color: ui.colors.text,
        }}
      >
        {title || "Team"}{" "}
        <span style={{ color: ui.colors.textSoft, fontWeight: 400 }}>· {entries.length}</span>
      </div>
      {entries.map(([key, user]) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderBottom: `1px solid ${ui.colors.border}`,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: ui.colors.primarySoft,
              color: ui.colors.primaryStrong,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {initials(user?.name)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ui.colors.text }}>
              {user?.name ?? key}
            </div>
            <div style={{ fontSize: 12, color: ui.colors.textSoft }}>@{key}</div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: ROLE_TONE[user?.role ?? "viewer"],
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {user?.role ?? "viewer"}
          </span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: user?.active ? ui.colors.success : ui.colors.borderStrong,
            }}
          />
        </div>
      ))}
    </div>
  );
}
