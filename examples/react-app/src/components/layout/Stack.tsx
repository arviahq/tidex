import { ui } from "../../ui/theme";

export type StackProps = {
  direction: "row" | "column";
  /** Space between items. @min(0) @max(48) @step(4) @slider */
  gap: number;
  align: "start" | "center" | "end" | "stretch";
  wrap: boolean;
  /** How many demo items to render. @min(1) @max(10) */
  items: number;
};

const ALIGN = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

export function Stack({ direction, gap, align, wrap, items }: StackProps) {
  const count = Math.max(1, Math.min(10, Math.round(items)));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap,
        alignItems: ALIGN[align],
        flexWrap: wrap ? "wrap" : "nowrap",
        padding: 16,
        minWidth: 260,
        background: ui.colors.bgMuted,
        border: `1px solid ${ui.colors.border}`,
        borderRadius: ui.radius.md,
        fontFamily: ui.font,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: "10px 16px",
            background: ui.colors.bg,
            border: `1px solid ${ui.colors.border}`,
            borderRadius: ui.radius.sm,
            color: ui.colors.text,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: ui.shadow.sm,
          }}
        >
          Item {i + 1}
        </div>
      ))}
    </div>
  );
}
