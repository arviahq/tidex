import { initials, text, ui } from "../../ui/theme";

// Exercises a `Date` prop (`lastSeen`) — a non-primitive reference type the
// scanner classifies as `unknown` (skipped from controls/args), so it renders
// from an internal fallback. Plus STRING, a UNION, and a BOOLEAN.
export type SessionBadgeProps = {
  user: string;
  lastSeen: Date;
  status: "online" | "away" | "offline";
  compact: boolean;
};

const dots = {
  online: ui.colors.success,
  away: ui.colors.warning,
  offline: ui.colors.textSoft,
};

function relative(date: Date): string {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export function SessionBadge({ user, lastSeen, status, compact }: SessionBadgeProps) {
  const seen = lastSeen instanceof Date ? lastSeen : new Date(Date.now() - 9 * 60000);
  const dot = dots[status] ?? dots.offline;
  const name = text(user, "Jane Cooper");

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: compact ? "6px 10px" : "10px 14px",
        borderRadius: ui.radius.full,
        background: ui.colors.bgMuted,
        border: `1px solid ${ui.colors.border}`,
        fontFamily: ui.font,
      }}
    >
      <span style={{ position: "relative", display: "inline-flex" }}>
        <span
          style={{
            width: compact ? 24 : 30,
            height: compact ? 24 : 30,
            borderRadius: "50%",
            background: ui.colors.primary,
            color: "#fff",
            fontSize: compact ? 11 : 12,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials(name)}
        </span>
        <span
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: dot,
            border: `2px solid ${ui.colors.bg}`,
          }}
        />
      </span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: ui.colors.text }}>{name}</span>
        {!compact ? (
          <span style={{ fontSize: 11, color: ui.colors.textMuted }}>
            {status === "online" ? "Active now" : `Seen ${relative(seen)}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
