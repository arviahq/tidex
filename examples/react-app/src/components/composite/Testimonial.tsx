import { ui, text, initials } from "../../ui/theme";

export type TestimonialProps = {
  /** The quote. @multiline @maxLength(280) */
  quote: string;
  author: string;
  role: string;
  /** Avatar background. @color */
  avatarColor: string;
  /** Star rating. @min(0) @max(5) @slider */
  rating: number;
};

export function Testimonial({ quote, author, role, avatarColor, rating }: TestimonialProps) {
  const stars = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <figure
      style={{
        width: "100%",
        maxWidth: 560,
        margin: 0,
        padding: "clamp(20px, 4vw, 32px)",
        borderRadius: ui.radius.lg,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        boxShadow: ui.shadow.md,
        fontFamily: ui.font,
        boxSizing: "border-box",
      }}
    >
      <div style={{ color: ui.colors.warning, fontSize: 16, letterSpacing: 2 }}>
        {"★".repeat(stars)}
        <span style={{ color: ui.colors.borderStrong }}>{"★".repeat(5 - stars)}</span>
      </div>
      <blockquote
        style={{
          margin: "14px 0 0",
          fontSize: "clamp(16px, 2.4vw, 21px)",
          lineHeight: 1.5,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: ui.colors.text,
        }}
      >
        “
        {text(
          quote,
          "Tidex changed how our team reviews UI. Every prop is just there, ready to tweak.",
        )}
        ”
      </blockquote>
      <figcaption style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: avatarColor || ui.colors.primary,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {initials(author)}
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: ui.colors.text }}>
            {text(author, "Jane Cooper")}
          </div>
          <div style={{ fontSize: 13, color: ui.colors.textMuted }}>
            {text(role, "Head of Design, Acme")}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
