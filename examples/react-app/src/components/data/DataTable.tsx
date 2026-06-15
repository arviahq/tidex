import { text, ui } from "../../ui/theme";

export type DataRow = { id: number; name: string; value: number };

// Exercises ARRAY props: `columns: string[]` and `rows: DataRow[]`. The
// extractor classifies arrays as `unknown` (no control, no default arg), so
// the component renders from internal fallbacks. `striped`/`density`/`caption`
// remain controllable (boolean / union / string).
export type DataTableProps = {
  columns: string[];
  rows: DataRow[];
  striped: boolean;
  density: "compact" | "comfortable";
  caption?: string;
};

const FALLBACK_COLUMNS = ["Name", "Value", "Share"];
const FALLBACK_ROWS: DataRow[] = [
  { id: 1, name: "Acme Corp", value: 4820 },
  { id: 2, name: "Globex", value: 3110 },
  { id: 3, name: "Initech", value: 2240 },
];

export function DataTable({ columns, rows, striped, density, caption }: DataTableProps) {
  const cols = columns?.length ? columns : FALLBACK_COLUMNS;
  const data = rows?.length ? rows : FALLBACK_ROWS;
  const total = data.reduce((sum, r) => sum + (r.value || 0), 0) || 1;
  const pad = density === "compact" ? "6px 12px" : "10px 14px";

  return (
    <table
      style={{
        borderCollapse: "collapse",
        fontFamily: ui.font,
        fontSize: 13,
        color: ui.colors.text,
        border: `1px solid ${ui.colors.border}`,
        borderRadius: ui.radius.md,
        overflow: "hidden",
        minWidth: 360,
      }}
    >
      {caption ? (
        <caption
          style={{
            captionSide: "top",
            textAlign: "left",
            padding: "0 0 8px",
            fontSize: 12,
            fontWeight: 600,
            color: ui.colors.textMuted,
          }}
        >
          {text(caption, "Top accounts")}
        </caption>
      ) : null}
      <thead>
        <tr style={{ background: ui.colors.bgSubtle }}>
          {cols.map((col) => (
            <th
              key={col}
              style={{
                textAlign: "left",
                padding: pad,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: ui.colors.textMuted,
                borderBottom: `1px solid ${ui.colors.border}`,
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={row.id}
            style={{ background: striped && i % 2 === 1 ? ui.colors.bgMuted : ui.colors.bg }}
          >
            <td style={{ padding: pad, fontWeight: 600 }}>{row.name}</td>
            <td style={{ padding: pad, fontVariantNumeric: "tabular-nums" }}>
              {row.value.toLocaleString()}
            </td>
            <td style={{ padding: pad, color: ui.colors.textMuted }}>
              {Math.round((row.value / total) * 100)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
