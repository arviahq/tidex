import type { PropSchema } from "../../api";
import type { ControlNodeProps } from "./types";
import { Control, ControlField } from "./Control";
import { defaultFor, toSet } from "./helpers";
import { TableControl } from "./TableControl";

const PRIMITIVE_KINDS = new Set(["string", "number", "boolean", "union", "date"]);

function isPrimitiveElement(element: PropSchema | undefined): boolean {
  return !element || PRIMITIVE_KINDS.has(element.type);
}

function cloneItem(value: unknown): unknown {
  if (value && typeof value === "object") {
    try {
      return structuredClone(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Array / Set editor. Primitive elements render as an inline chip list; object
 * (and other complex) elements render as a master-detail list of expandable
 * rows. Large object collections switch to a table. Sets materialize back to a
 * real `Set` (deduped); arrays stay arrays.
 */
export function CollectionControl(props: ControlNodeProps) {
  const { schema, value, onChange, depth, query } = props;
  if (schema.type !== "array" && schema.type !== "set") return null;
  const isSet = schema.type === "set";
  const element = schema.element;
  const items: unknown[] = isSet ? [...toSet(value)] : Array.isArray(value) ? value : [];

  const commit = (next: unknown[]) => onChange(isSet ? new Set(next) : next);
  const setItem = (i: number, v: unknown) =>
    commit(items.map((item, idx) => (idx === i ? v : item)));
  const removeItem = (i: number) => commit(items.filter((_, idx) => idx !== i));
  const addItem = () => commit([...items, defaultFor(element)]);
  const duplicateItem = (i: number) => {
    const next = [...items];
    next.splice(i + 1, 0, cloneItem(items[i]));
    commit(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    commit(next);
  };

  // Object collections beyond a few rows are far easier to scan as a table.
  if (!isSet && element?.type === "object" && items.length > 4) {
    return <TableControl {...props} />;
  }

  if (isPrimitiveElement(element)) {
    return (
      <div className="bb-controls__chips">
        {items.map((item, i) => (
          <span className="bb-controls__chip" key={i}>
            <Control
              schema={element ?? { type: "string" }}
              value={item}
              name={`${i}`}
              depth={depth + 1}
              onChange={(v) => setItem(i, v)}
            />
            <button
              type="button"
              className="bb-controls__chip-remove"
              aria-label="Remove"
              onClick={() => removeItem(i)}
            >
              ×
            </button>
          </span>
        ))}
        <button type="button" className="bb-controls__add" onClick={addItem}>
          + Add
        </button>
        {isSet ? <span className="bb-controls__hint">unique</span> : null}
      </div>
    );
  }

  return (
    <div className="bb-controls__list">
      {items.map((item, i) => (
        <div className="bb-controls__item" key={i}>
          <div className="bb-controls__item-actions">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              aria-label="Move down"
            >
              ↓
            </button>
            <button type="button" onClick={() => duplicateItem(i)} aria-label="Duplicate">
              ⧉
            </button>
            <button type="button" onClick={() => removeItem(i)} aria-label="Remove">
              ×
            </button>
          </div>
          <ControlField
            schema={element ?? { type: "unknown" }}
            name={`#${i + 1}`}
            depth={depth + 1}
            value={item}
            onChange={(v) => setItem(i, v)}
            query={query}
          />
        </div>
      ))}
      <button type="button" className="bb-controls__add" onClick={addItem}>
        + Add item
      </button>
    </div>
  );
}
