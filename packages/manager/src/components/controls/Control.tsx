import { useState } from "react";
import { validateValue } from "@tide/react";
import type { ControlNodeProps } from "./types";
import { isComplexSchema, summarize } from "./helpers";
import {
  BooleanControl,
  DateControl,
  NumberControl,
  StringControl,
  UnionControl,
  UnknownControl,
} from "./primitives";
import { ObjectControl } from "./ObjectControl";
import { CollectionControl } from "./CollectionControl";
import { MapControl } from "./MapControl";
import { TupleControl } from "./TupleControl";
import { VariantControl } from "./VariantControl";
import { RawJsonControl } from "./RawJsonControl";

/**
 * The control registry: dispatch a schema to its editor. Returns the bare
 * editor body (no label) — labeling, collapsing, and the escape hatch are
 * {@link ControlField}'s job. Containers recurse back through ControlField, so
 * any depth of nesting gets the right editor automatically.
 */
export function Control(props: ControlNodeProps) {
  switch (props.schema.type) {
    case "boolean":
      return <BooleanControl {...props} />;
    case "string":
      return <StringControl {...props} />;
    case "number":
      return <NumberControl {...props} />;
    case "date":
      return <DateControl {...props} />;
    case "union":
      return <UnionControl {...props} />;
    case "object":
      return <ObjectControl {...props} />;
    case "array":
    case "set":
      return <CollectionControl {...props} />;
    case "map":
    case "record":
      return <MapControl {...props} />;
    case "tuple":
      return <TupleControl {...props} />;
    case "variant":
      return <VariantControl {...props} />;
    default:
      return <UnknownControl {...props} />;
  }
}

interface ControlFieldProps extends ControlNodeProps {
  /** Render the body inline without the collapsible header (used when a parent
   * — e.g. a variant picker or entity detail — already provides the heading). */
  embedded?: boolean;
}

/**
 * A labeled control row. Primitive leaves render as a `name | editor` row with
 * inline validation. Complex values render as a collapsible section with a
 * raw-JSON escape hatch toggle. Recursion flows: ControlField → Control →
 * container → ControlField.
 */
export function ControlField({ embedded, ...props }: ControlFieldProps) {
  const { schema, value, name, depth } = props;
  const complex = isComplexSchema(schema);
  const required = "required" in schema && schema.required === true;
  const description = schema.description;

  const [open, setOpen] = useState(depth < 1);
  const [raw, setRaw] = useState(false);

  if (embedded) {
    return <Control {...props} />;
  }

  if (!complex) {
    const error = validateValue(schema, value);
    return (
      <div className="bb-controls__row" data-depth={depth}>
        <span className="bb-controls__name" title={description}>
          {name}
          {required ? <span className="bb-controls__required">*</span> : null}
        </span>
        <div className="bb-controls__control">
          <Control {...props} />
          {error ? <span className="bb-controls__error">{error.message}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="bb-controls__group" data-depth={depth}>
      <div className="bb-controls__group-header">
        <button
          type="button"
          className="bb-controls__chevron"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span data-open={open ? "true" : undefined}>▶</span>
          <span className="bb-controls__name" title={description}>
            {name}
            {required ? <span className="bb-controls__required">*</span> : null}
          </span>
        </button>
        {!open ? <span className="bb-controls__summary">{summarize(value)}</span> : null}
        <button
          type="button"
          className="bb-controls__json-toggle"
          data-active={raw ? "true" : undefined}
          title={raw ? "Structured editor" : "Edit as JSON"}
          aria-label="Toggle raw JSON"
          onClick={() => setRaw((v) => !v)}
        >
          {"{ }"}
        </button>
      </div>
      {open ? (
        <div className="bb-controls__group-body">
          {raw ? <RawJsonControl {...props} /> : <Control {...props} />}
        </div>
      ) : null}
    </div>
  );
}
