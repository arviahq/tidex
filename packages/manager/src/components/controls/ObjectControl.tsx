import type { ControlNodeProps } from "./types";
import { ControlField } from "./Control";
import { matchesQuery } from "./search";

/** Fixed-shape object → one labeled field per property, recursing into each. */
export function ObjectControl({ schema, value, onChange, depth, query }: ControlNodeProps) {
  if (schema.type !== "object") return null;
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const entries = Object.entries(schema.properties).filter(
    ([key, child]) => !query || matchesQuery(key, child, query),
  );

  if (entries.length === 0) {
    return <p className="bb-controls__empty bb-controls__empty--nested">No matching properties.</p>;
  }

  return (
    <div className="bb-controls__nested">
      {entries.map(([key, child]) => (
        <ControlField
          key={key}
          schema={child}
          name={key}
          depth={depth + 1}
          value={obj[key]}
          onChange={(next) => onChange({ ...obj, [key]: next })}
          query={query}
        />
      ))}
    </div>
  );
}
