import { ui, text } from "../../ui/theme";

export type ProseProps = {
  /** Heading shown above the body. */
  title: string;
  /** Body copy — supports multiple paragraphs. @multiline @maxLength(600) */
  content: string;
  size: "sm" | "md" | "lg";
  align: "left" | "center";
};

const SIZE = { sm: 13, md: 15, lg: 18 } as const;

export function Prose({ title, content, size, align }: ProseProps) {
  const heading = text(title, "Release notes");
  const body = text(
    content,
    "Tidex turns your components into a living catalog.\n\nEdit any prop and watch the preview update instantly.",
  );
  return (
    <article
      style={{
        maxWidth: 420,
        padding: 20,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        borderRadius: ui.radius.md,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
        textAlign: align,
        color: ui.colors.text,
      }}
    >
      <h3 style={{ margin: 0, fontSize: SIZE[size] + 6, letterSpacing: "-0.02em" }}>{heading}</h3>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {body.split(/\n{2,}|\n/).map((para, i) => (
          <p
            key={i}
            style={{ margin: 0, fontSize: SIZE[size], lineHeight: 1.6, color: ui.colors.textMuted }}
          >
            {para}
          </p>
        ))}
      </div>
    </article>
  );
}
