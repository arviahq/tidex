import { ui } from "../../ui/theme";

// Exercises a SET prop (`tags: Set<string>`) and a string ARRAY (`selected`).
// Both classify as `unknown` (skipped from controls/args), so the component
// renders from internal fallbacks. `max` (number) and `interactive` (boolean)
// stay controllable.
export type TagCloudProps = {
  tags: Set<string>;
  selected: string[];
  max: number;
  interactive: boolean;
};

const FALLBACK_TAGS = new Set([
  "design",
  "react",
  "tokens",
  "a11y",
  "preview",
  "tidex",
  "props",
  "variants",
]);

export function TagCloud({ tags, selected, max, interactive }: TagCloudProps) {
  const all = tags instanceof Set && tags.size ? Array.from(tags) : Array.from(FALLBACK_TAGS);
  const picked = new Set(Array.isArray(selected) ? selected : ["react", "tidex"]);
  const limit = max > 0 ? max : all.length;
  const shown = all.slice(0, limit);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        maxWidth: 360,
        fontFamily: ui.font,
      }}
    >
      {shown.map((tag) => {
        const on = picked.has(tag);
        return (
          <span
            key={tag}
            style={{
              padding: "5px 12px",
              borderRadius: ui.radius.full,
              fontSize: 13,
              fontWeight: 500,
              cursor: interactive ? "pointer" : "default",
              background: on ? ui.colors.primary : ui.colors.bgSubtle,
              color: on ? "#fff" : ui.colors.textMuted,
              border: `1px solid ${on ? ui.colors.primary : ui.colors.border}`,
            }}
          >
            {tag}
          </span>
        );
      })}
      {all.length > limit ? (
        <span style={{ padding: "5px 12px", fontSize: 13, color: ui.colors.textSoft }}>
          +{all.length - limit} more
        </span>
      ) : null}
    </div>
  );
}
