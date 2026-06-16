import { useMemo, useState } from "react";
import type { PropSchema } from "../api";
import { generateJsxSnippet } from "@tidex/react";
import { CodeBlock } from "./CodeBlock";
import { ControlField } from "./controls/Control";
import { matchesQuery } from "./controls/search";
import "./controls.css";

interface ControlsPanelProps {
  componentName: string;
  props: Record<string, PropSchema>;
  args: Record<string, unknown>;
  onChange: (args: Record<string, unknown>) => void;
}

// Props that never produce a control (callbacks surface in Interactions).
function isControllable(schema: PropSchema): boolean {
  return schema.type !== "callback";
}

export function ControlsPanel({ componentName, props, args, onChange }: ControlsPanelProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const entries = useMemo(
    () =>
      Object.entries(props)
        .filter(([, schema]) => isControllable(schema))
        .filter(([name, schema]) => !q || matchesQuery(name, schema, q)),
    [props, q],
  );

  const code = useMemo(() => generateJsxSnippet(componentName, args), [componentName, args]);

  const allEntries = useMemo(
    () => Object.entries(props).filter(([, schema]) => isControllable(schema)),
    [props],
  );

  if (allEntries.length === 0) {
    return <p className="bb-controls__empty">No controllable props detected.</p>;
  }

  return (
    <div>
      {allEntries.length > 4 ? (
        <input
          type="search"
          className="bb-controls__search"
          placeholder="Search props…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}

      <div className="bb-controls">
        {entries.length === 0 ? (
          <p className="bb-controls__empty bb-controls__empty--nested">No props match “{query}”.</p>
        ) : (
          entries.map(([name, schema]) => (
            <ControlField
              key={name}
              schema={schema}
              name={name}
              depth={0}
              value={args[name]}
              onChange={(next) => onChange({ ...args, [name]: next })}
              query={q || undefined}
            />
          ))
        )}
      </div>

      <CodeBlock code={code} language="tsx" className="bb-controls__code" />
    </div>
  );
}
