import type { ControlNodeProps } from "./types";
import { ControlField } from "./Control";

/** Fixed-length, positional tuple → one labeled slot per element. */
export function TupleControl({ schema, value, onChange, depth, query }: ControlNodeProps) {
  if (schema.type !== "tuple") return null;
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="bb-controls__nested">
      {schema.elements.map((element, i) => (
        <ControlField
          key={i}
          schema={element}
          name={schema.labels?.[i] ?? `[${i}]`}
          depth={depth + 1}
          value={items[i]}
          onChange={(v) => {
            const next = [...items];
            next[i] = v;
            onChange(next);
          }}
          query={query}
        />
      ))}
    </div>
  );
}
