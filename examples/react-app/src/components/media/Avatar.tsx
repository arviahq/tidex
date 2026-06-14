import { initials, text, ui } from "../../ui/theme";

export type AvatarProps = {
  name: string;
  size: "sm" | "md" | "lg";
  shape: "circle" | "rounded";
  status?: "online" | "away" | "offline";
  imageUrl?: string;
};

const sizes = { sm: 36, md: 48, lg: 64 };
const fontSizes = { sm: 13, md: 16, lg: 20 };
const statusColors = {
  online: ui.colors.success,
  away: ui.colors.warning,
  offline: ui.colors.textSoft,
};

export function Avatar({ name, size, shape, status, imageUrl }: AvatarProps) {
  const displayName = text(name, "Jane Cooper");
  const px = sizes[size];
  const radius = shape === "circle" ? ui.radius.full : ui.radius.md;
  const image = text(imageUrl, "");

  return (
    <div style={{ position: "relative", display: "inline-flex", width: px, height: px }}>
      {image ? (
        <img
          src={image}
          alt={displayName}
          style={{
            width: px,
            height: px,
            borderRadius: radius,
            objectFit: "cover",
            border: "2px solid #fff",
            boxShadow: `0 0 0 1px ${ui.colors.border}, ${ui.shadow.sm}`,
          }}
        />
      ) : (
        <div
          aria-label={displayName}
          style={{
            width: px,
            height: px,
            borderRadius: radius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%)",
            color: "#fff",
            fontFamily: ui.font,
            fontSize: fontSizes[size],
            fontWeight: 700,
            letterSpacing: "-0.02em",
            boxShadow: `0 0 0 1px rgba(79, 70, 229, 0.18), ${ui.shadow.sm}`,
          }}
        >
          {initials(displayName)}
        </div>
      )}
      {status ? (
        <span
          aria-label={status}
          style={{
            position: "absolute",
            right: 1,
            bottom: 1,
            width: size === "sm" ? 9 : 11,
            height: size === "sm" ? 9 : 11,
            borderRadius: ui.radius.full,
            background: statusColors[status],
            border: "2px solid #fff",
            boxShadow: ui.shadow.sm,
          }}
        />
      ) : null}
    </div>
  );
}
