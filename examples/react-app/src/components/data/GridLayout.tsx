import { ui } from "../../ui/theme";

// Exercises a NUMERIC literal union (`columns: 1 | 2 | 3 | 4`) alongside a
// plain NUMBER (`gap`) and a BOOLEAN (`bordered`).
export type GridLayoutProps = {
  columns: 1 | 2 | 3 | 4;
  gap: number;
  bordered: boolean;
};

export function GridLayout({ columns, gap, bordered }: GridLayoutProps) {
  const cols = [1, 2, 3, 4].includes(columns) ? columns : 3;
  const g = Number.isFinite(gap) ? gap : 12;
  const cells = Array.from({ length: cols * 2 }, (_, i) => i);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: g,
        width: 320,
        fontFamily: ui.font,
      }}
    >
      {cells.map((i) => (
        <div
          key={i}
          style={{
            height: 44,
            borderRadius: ui.radius.sm,
            background: ui.colors.bgSubtle,
            border: bordered ? `1px solid ${ui.colors.borderStrong}` : "1px solid transparent",
          }}
        />
      ))}
    </div>
  );
}
