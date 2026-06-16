import { ui, initials } from "../../ui/theme";

export interface AvatarGroupMember {
  name: string;
  color?: string;
}

export interface AvatarGroupProps {
  members: AvatarGroupMember[];
  /** Max avatars shown before a "+N" chip. @min(1) @max(8) */
  max: number;
  size: "sm" | "md" | "lg";
}

const PX = { sm: 28, md: 36, lg: 48 } as const;

export function AvatarGroup({ members, max, size }: AvatarGroupProps) {
  const list = Array.isArray(members) ? members : [];
  const limit = Math.max(1, Math.min(8, Math.round(max)));
  const shown = list.slice(0, limit);
  const overflow = list.length - shown.length;
  const dim = PX[size];

  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: 16, fontFamily: ui.font }}>
      {shown.map((m, i) => (
        <span
          key={i}
          style={{
            width: dim,
            height: dim,
            marginLeft: i === 0 ? 0 : -dim / 3,
            borderRadius: 999,
            background: m.color || ui.colors.primarySoft,
            color: m.color ? "#fff" : ui.colors.primaryStrong,
            border: `2px solid ${ui.colors.bg}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: dim / 2.8,
            fontWeight: 700,
          }}
        >
          {initials(m.name)}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          style={{
            width: dim,
            height: dim,
            marginLeft: -dim / 3,
            borderRadius: 999,
            background: ui.colors.bgSubtle,
            color: ui.colors.textMuted,
            border: `2px solid ${ui.colors.bg}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: dim / 3,
            fontWeight: 700,
          }}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
