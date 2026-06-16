import type { PropSchema } from "../../api";
import type { ControlNodeProps } from "./types";
import { Control } from "./Control";
import { defaultFor } from "./helpers";

const INLINE_KINDS = new Set(["string", "number", "boolean", "union", "date"]);

/**
 * Table mode for arrays of uniform objects — one column per primitive
 * property, inline-editable cells, plus add/remove rows. Non-primitive columns
 * fall back to a compact summary (edit them by switching to the JSON escape
 * hatch). Used automatically for object arrays past a few rows.
 */
export function TableControl({ schema, value, onChange, depth }: ControlNodeProps) {
  if (schema.type !== "array" || schema.element?.type !== "object") return null;
  const element = schema.element;
  const columns = Object.entries(element.properties);
  const rows = (Array.isArray(value) ? value : []) as Array<Record<string, unknown>>;

  const setCell = (rowIndex: number, key: string, cellValue: unknown) =>
    onChange(rows.map((row, i) => (i === rowIndex ? { ...row, [key]: cellValue } : row)));
  const removeRow = (rowIndex: number) => onChange(rows.filter((_, i) => i !== rowIndex));
  const addRow = () => onChange([...rows, defaultFor(element)]);

  return (
    <div className="bb-controls__table-wrap">
      <table className="bb-controls__table">
        <thead>
          <tr>
            {columns.map(([key]) => (
              <th key={key}>{key}</th>
            ))}
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map(([key, colSchema]) => (
                <td key={key}>
                  {INLINE_KINDS.has((colSchema as PropSchema).type) ? (
                    <Control
                      schema={colSchema}
                      value={row?.[key]}
                      name={key}
                      depth={depth + 1}
                      onChange={(v) => setCell(rowIndex, key, v)}
                    />
                  ) : (
                    <span className="bb-controls__muted">…</span>
                  )}
                </td>
              ))}
              <td>
                <button
                  type="button"
                  className="bb-controls__chip-remove"
                  aria-label="Remove row"
                  onClick={() => removeRow(rowIndex)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="bb-controls__add" onClick={addRow}>
        + Add row
      </button>
    </div>
  );
}
