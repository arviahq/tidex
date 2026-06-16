import { ui } from "../../ui/theme";
import { text } from "../../ui/theme";

export type DividerProps = {
  orientation: "horizontal" | "vertical";
  /** Line color. @color */
  color: string;
  /** Line thickness in px. @min(1) @max(8) @slider */
  thickness: number;
  variant: "solid" | "dashed" | "dotted";
  label?: string;
};

export function Divider({ orientation, color, thickness, variant, label }: DividerProps) {
  const line = color || ui.colors.border;
  if (orientation === "vertical") {
    return (
      <div style={{ height: 120, display: "flex", alignItems: "center", padding: 16 }}>
        <div
          style={{
            width: thickness,
            height: "100%",
            borderLeft: `${thickness}px ${variant} ${line}`,
          }}
        />
      </div>
    );
  }
  const labelText = text(label, "");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: 320,
        padding: 16,
        fontFamily: ui.font,
        color: ui.colors.textMuted,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      <span style={{ flex: 1, borderTop: `${thickness}px ${variant} ${line}` }} />
      {labelText ? <span>{labelText}</span> : null}
      {labelText ? (
        <span style={{ flex: 1, borderTop: `${thickness}px ${variant} ${line}` }} />
      ) : null}
    </div>
  );
}
