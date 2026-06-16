import { ui } from "../../ui/theme";

export type TagInputProps = {
  label: string;
  /** Current tags (ordered, may repeat). */
  tags: string[];
  /** Suggested tags (unique). */
  suggestions: Set<string>;
  /** Max selectable tags. @min(1) @max(12) */
  max: number;
  placeholder: string;
};

export function TagInput({ label, tags, suggestions, max, placeholder }: TagInputProps) {
  const current = Array.isArray(tags) ? tags : [];
  const suggested = [...(suggestions instanceof Set ? suggestions : new Set<string>())].filter(
    (s) => !current.includes(s),
  );
  return (
    <div style={{ width: 320, fontFamily: ui.font, padding: 16 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: ui.colors.text,
          marginBottom: 8,
        }}
      >
        {label || "Skills"}{" "}
        <span style={{ color: ui.colors.textSoft, fontWeight: 400 }}>
          ({current.length}/{max})
        </span>
      </span>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          minHeight: 40,
          alignItems: "center",
          padding: "6px 8px",
          background: ui.colors.bg,
          border: `1px solid ${ui.colors.border}`,
          borderRadius: ui.radius.sm,
        }}
      >
        {current.length === 0 ? (
          <span style={{ color: ui.colors.textSoft, fontSize: 13 }}>
            {placeholder || "Add a tag…"}
          </span>
        ) : (
          current.map((tag, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                background: ui.colors.primarySoft,
                color: ui.colors.primaryStrong,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {tag}
              <span style={{ opacity: 0.6 }}>×</span>
            </span>
          ))
        )}
      </div>
      {suggested.length > 0 ? (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {suggested.map((s) => (
            <span
              key={s}
              style={{
                padding: "3px 8px",
                border: `1px dashed ${ui.colors.borderStrong}`,
                color: ui.colors.textMuted,
                borderRadius: 999,
                fontSize: 12,
              }}
            >
              + {s}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
