import { ui, text } from "../../ui/theme";

export type HeroProps = {
  eyebrow: string;
  title: string;
  /** Supporting paragraph. @multiline @maxLength(200) */
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  align: "left" | "center";
};

/**
 * Responsive marketing hero. Fluid type (clamp) and a max-width container let it
 * fill any preview width and reflow gracefully on narrow viewports.
 */
export function Hero({ eyebrow, title, subtitle, primaryCta, secondaryCta, align }: HeroProps) {
  const centered = align === "center";
  return (
    <section
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        padding: "clamp(24px, 5vw, 56px)",
        borderRadius: ui.radius.lg,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        boxShadow: ui.shadow.md,
        fontFamily: ui.font,
        textAlign: centered ? "center" : "left",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          display: "inline-block",
          padding: "5px 12px",
          borderRadius: ui.radius.full,
          background: ui.colors.primarySoft,
          color: ui.colors.primaryStrong,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {text(eyebrow, "New")}
      </span>
      <h1
        style={{
          margin: "16px 0 0",
          fontSize: "clamp(28px, 5vw, 46px)",
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          fontWeight: 800,
          color: ui.colors.text,
        }}
      >
        {text(title, "Ship your design system faster")}
      </h1>
      <p
        style={{
          margin: "14px auto 0",
          maxWidth: 540,
          marginLeft: centered ? "auto" : 0,
          fontSize: "clamp(15px, 2vw, 18px)",
          lineHeight: 1.6,
          color: ui.colors.textMuted,
        }}
      >
        {text(
          subtitle,
          "A polished, themeable component library your whole team can explore, tweak, and trust.",
        )}
      </p>
      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: centered ? "center" : "flex-start",
        }}
      >
        <button
          type="button"
          style={{
            padding: "12px 22px",
            border: "none",
            borderRadius: ui.radius.md,
            background: ui.gradient.brand,
            color: "#fff",
            fontFamily: ui.font,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: ui.shadow.sm,
          }}
        >
          {text(primaryCta, "Get started")}
        </button>
        {text(secondaryCta, "") ? (
          <button
            type="button"
            style={{
              padding: "12px 22px",
              borderRadius: ui.radius.md,
              border: `1px solid ${ui.colors.border}`,
              background: ui.colors.bg,
              color: ui.colors.text,
              fontFamily: ui.font,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {secondaryCta}
          </button>
        ) : null}
      </div>
    </section>
  );
}
