import { ui, text } from "../../ui/theme";

export interface NavbarProps {
  brand: string;
  links: string[];
  /** Index of the active link. @min(0) @max(6) */
  activeIndex: number;
  cta: string;
}

/** Responsive top navigation. The link row wraps under the brand on narrow widths. */
export function Navbar({ brand, links, activeIndex, cta }: NavbarProps) {
  const items = Array.isArray(links) ? links : [];
  return (
    <nav
      style={{
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
        padding: "12px 18px",
        borderRadius: ui.radius.md,
        background: `color-mix(in srgb, ${ui.colors.bg} 82%, transparent)`,
        backdropFilter: "blur(8px)",
        border: `1px solid ${ui.colors.border}`,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: ui.gradient.brand,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {text(brand, "Tidex").charAt(0).toUpperCase()}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: ui.colors.text }}>
          {text(brand, "Tidex")}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1, minWidth: 0 }}>
        {items.map((link, i) => (
          <span
            key={i}
            style={{
              padding: "6px 12px",
              borderRadius: ui.radius.sm,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: i === activeIndex ? ui.colors.primaryStrong : ui.colors.textMuted,
              background: i === activeIndex ? ui.colors.primarySoft : "transparent",
            }}
          >
            {link}
          </span>
        ))}
      </div>
      {text(cta, "") ? (
        <button
          type="button"
          style={{
            padding: "8px 16px",
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
          {cta}
        </button>
      ) : null}
    </nav>
  );
}
