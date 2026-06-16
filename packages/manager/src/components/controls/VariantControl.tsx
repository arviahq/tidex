import { defaultArgsForProp } from "@tidex/core";
import type { ControlNodeProps } from "./types";
import { ControlField } from "./Control";

/**
 * Discriminated union → a variant picker plus the chosen variant's inspector.
 * Switching variant rebuilds default args for the new shape and pins the
 * discriminant so the component renders a coherent branch.
 */
export function VariantControl({ schema, value, onChange, depth, query }: ControlNodeProps) {
  if (schema.type !== "variant") return null;
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const current = String(obj[schema.discriminant] ?? schema.variants[0]?.label ?? "");
  const active = schema.variants.find((v) => v.label === current) ?? schema.variants[0];

  const switchVariant = (label: string) => {
    const variant = schema.variants.find((v) => v.label === label);
    if (!variant) return;
    const next = defaultArgsForProp(variant.schema) as Record<string, unknown>;
    next[schema.discriminant] = label;
    onChange(next);
  };

  return (
    <div className="bb-controls__variant">
      <select
        className="bb-controls__input bb-controls__select"
        value={current}
        onChange={(event) => switchVariant(event.target.value)}
      >
        {schema.variants.map((v) => (
          <option key={v.label} value={v.label}>
            {v.label}
          </option>
        ))}
      </select>
      {active ? (
        <ControlField
          schema={active.schema}
          // The active variant's object inspector is rendered inline (no extra
          // header) by giving it the same name and letting it expand below.
          name={active.label}
          depth={depth}
          value={obj}
          onChange={onChange}
          query={query}
          embedded
        />
      ) : null}
    </div>
  );
}
