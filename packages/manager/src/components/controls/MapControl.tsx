import { useState } from "react";
import type { ControlNodeProps } from "./types";
import { Control, ControlField } from "./Control";
import { defaultFor, toMap } from "./helpers";

/**
 * `Map` / `Record` editor. The two differ only in materialization — a `Map`
 * value or a plain object — so they share one UI. Object values get an entity
 * explorer (key list + selected inspector); primitive values get key→value
 * rows. Keys are edited as strings.
 */
export function MapControl({ schema, value, onChange, depth, query }: ControlNodeProps) {
  if (schema.type !== "map" && schema.type !== "record") return null;
  const asRecord = schema.type === "record";
  const valueSchema = schema.value;
  const entries = [...toMap(value)] as Array<[unknown, unknown]>;

  const commit = (next: Array<[unknown, unknown]>) => {
    if (asRecord) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of next) obj[String(k)] = v;
      onChange(obj);
    } else {
      onChange(new Map(next));
    }
  };
  const setKey = (i: number, key: string) =>
    commit(entries.map((e, idx) => (idx === i ? [key, e[1]] : e)));
  const setVal = (i: number, v: unknown) =>
    commit(entries.map((e, idx) => (idx === i ? [e[0], v] : e)));
  const removeEntry = (i: number) => commit(entries.filter((_, idx) => idx !== i));
  const addEntry = () => {
    let key = "key";
    let n = 1;
    const taken = new Set(entries.map((e) => String(e[0])));
    while (taken.has(key)) key = `key${++n}`;
    commit([...entries, [key, defaultFor(valueSchema)]]);
  };

  const objectValues = valueSchema?.type === "object";

  if (objectValues) {
    return (
      <EntityExplorer
        entries={entries}
        valueSchema={valueSchema!}
        depth={depth}
        query={query}
        onSetKey={setKey}
        onSetVal={setVal}
        onRemove={removeEntry}
        onAdd={addEntry}
      />
    );
  }

  return (
    <div className="bb-controls__kv">
      {entries.map(([key, val], i) => (
        <div className="bb-controls__kv-row" key={i}>
          <input
            className="bb-controls__input bb-controls__kv-key"
            value={String(key)}
            onChange={(event) => setKey(i, event.target.value)}
          />
          <span className="bb-controls__kv-arrow">→</span>
          <div className="bb-controls__kv-value">
            <Control
              schema={valueSchema ?? { type: "string" }}
              value={val}
              name={String(key)}
              depth={depth + 1}
              onChange={(v) => setVal(i, v)}
            />
          </div>
          <button
            type="button"
            className="bb-controls__chip-remove"
            aria-label="Remove"
            onClick={() => removeEntry(i)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="bb-controls__add" onClick={addEntry}>
        + Add entry
      </button>
    </div>
  );
}

interface EntityExplorerProps {
  entries: Array<[unknown, unknown]>;
  valueSchema: import("../../api").PropSchema;
  depth: number;
  query?: string;
  onSetKey: (i: number, key: string) => void;
  onSetVal: (i: number, v: unknown) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
}

function EntityExplorer({
  entries,
  valueSchema,
  depth,
  query,
  onSetKey,
  onSetVal,
  onRemove,
  onAdd,
}: EntityExplorerProps) {
  const [selected, setSelected] = useState(0);
  const active = Math.min(selected, entries.length - 1);

  return (
    <div className="bb-controls__entity">
      <div className="bb-controls__entity-list">
        {entries.map(([key], i) => (
          <button
            key={i}
            type="button"
            className="bb-controls__entity-key"
            data-active={i === active ? "true" : undefined}
            onClick={() => setSelected(i)}
          >
            {String(key) || "(empty)"}
          </button>
        ))}
        <button type="button" className="bb-controls__add" onClick={onAdd}>
          + Add
        </button>
      </div>
      <div className="bb-controls__entity-detail">
        {entries[active] ? (
          <>
            <div className="bb-controls__kv-row">
              <span className="bb-controls__name">key</span>
              <input
                className="bb-controls__input bb-controls__kv-key"
                value={String(entries[active]![0])}
                onChange={(event) => onSetKey(active, event.target.value)}
              />
              <button
                type="button"
                className="bb-controls__chip-remove"
                aria-label="Remove"
                onClick={() => onRemove(active)}
              >
                ×
              </button>
            </div>
            <ControlField
              schema={valueSchema}
              name={String(entries[active]![0])}
              depth={depth}
              value={entries[active]![1]}
              onChange={(v) => onSetVal(active, v)}
              query={query}
              embedded
            />
          </>
        ) : (
          <p className="bb-controls__empty bb-controls__empty--nested">No entries.</p>
        )}
      </div>
    </div>
  );
}
