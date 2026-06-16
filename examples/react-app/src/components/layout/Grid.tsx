import { ui } from "../../ui/theme";

export type GridProps = {
  /** Column count. @min(1) @max(6) @slider */
  columns: number;
  /** Gutter between cells. @min(0) @max(32) @step(4) @slider */
  gap: number;
  /** Cells to render. @min(1) @max(24) */
  cells: number;
  aspect: "square" | "wide" | "tall";
};

const RATIO = { square: "1 / 1", wide: "16 / 9", tall: "3 / 4" } as const;

export function Grid({ columns, gap, cells, aspect }: GridProps) {
  const cols = Math.max(1, Math.min(6, Math.round(columns)));
  const count = Math.max(1, Math.min(24, Math.round(cells)));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
        width: 360,
        padding: 16,
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
            aspectRatio: RATIO[aspect],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: ui.colors.primarySoft,
            color: ui.colors.primaryStrong,
            border: `1px solid ${ui.colors.border}`,
            borderRadius: ui.radius.sm,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
