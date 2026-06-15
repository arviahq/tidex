import { useMemo } from "react";
import type { PropSchema } from "../api";
import { propToControl, generateJsxSnippet, coerceUnionValue, type ControlDef } from "@tide/react";
import { Switch } from "./Switch";
import { CodeBlock } from "./CodeBlock";
import "./controls.css";

interface ControlsPanelProps {
  componentName: string;
  props: Record<string, PropSchema>;
  args: Record<string, unknown>;
  onChange: (args: Record<string, unknown>) => void;
}

/** A date control's value as a `YYYY-MM-DD` string for `<input type="date">`. */
function toIsoDate(value: unknown): string {
  const date = value instanceof Date ? value : value ? new Date(value as string) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

/** Coerce a set control's value to a Set for editing. */
function toSet(value: unknown): Set<unknown> {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

export function ControlsPanel({ componentName, props, args, onChange }: ControlsPanelProps) {
  const controls: ControlDef[] = useMemo(
    () =>
      Object.entries(props)
        .map(([name, schema]) => propToControl(name, schema))
        .filter((c): c is ControlDef => c !== null),
    [props],
  );

  const code = useMemo(() => generateJsxSnippet(componentName, args), [componentName, args]);

  const update = (name: string, value: unknown) => {
    onChange({ ...args, [name]: value });
  };

  if (controls.length === 0) {
    return <p className="bb-controls__empty">No controllable props detected.</p>;
  }

  return (
    <div>
      <div className="bb-controls">
        {controls.map((control) => (
          <div key={control.name} className="bb-controls__row">
            <span className="bb-controls__name">{control.name}</span>
            <div className="bb-controls__control">
              {control.kind === "union" && control.options ? (
                <div className="bb-controls__segmented" role="group" aria-label={control.name}>
                  {control.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="bb-controls__segment"
                      data-active={String(args[control.name]) === option ? "true" : undefined}
                      onClick={() =>
                        update(control.name, coerceUnionValue(option, control.valueType))
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : control.kind === "boolean" ? (
                <Switch
                  checked={Boolean(args[control.name])}
                  onChange={(value) => update(control.name, value)}
                />
              ) : control.kind === "number" ? (
                <input
                  type="number"
                  className="bb-controls__input bb-controls__input--number"
                  value={args[control.name] == null ? "" : String(args[control.name])}
                  onChange={(event) =>
                    update(control.name, event.target.value === "" ? 0 : Number(event.target.value))
                  }
                />
              ) : control.kind === "date" ? (
                <input
                  type="date"
                  className="bb-controls__input bb-controls__input--text"
                  value={toIsoDate(args[control.name])}
                  // Keep the value a real Date — postMessage's structured clone
                  // preserves it, so the component receives a Date, not a string.
                  onChange={(event) =>
                    update(control.name, event.target.value ? new Date(event.target.value) : null)
                  }
                />
              ) : control.kind === "set" ? (
                <textarea
                  className="bb-controls__input bb-controls__textarea"
                  value={JSON.stringify([...toSet(args[control.name])], null, 2)}
                  onChange={(event) => {
                    try {
                      const parsed = JSON.parse(event.target.value);
                      if (Array.isArray(parsed)) update(control.name, new Set(parsed));
                    } catch {
                      // ignore invalid JSON while typing
                    }
                  }}
                />
              ) : control.kind === "object" || control.kind === "array" ? (
                <textarea
                  className="bb-controls__input bb-controls__textarea"
                  value={JSON.stringify(
                    args[control.name] ?? (control.kind === "array" ? [] : {}),
                    null,
                    2,
                  )}
                  onChange={(event) => {
                    try {
                      update(control.name, JSON.parse(event.target.value));
                    } catch {
                      // ignore invalid JSON while typing
                    }
                  }}
                />
              ) : (
                <input
                  type="text"
                  className="bb-controls__input bb-controls__input--text"
                  value={args[control.name] == null ? "" : String(args[control.name])}
                  onChange={(event) => update(control.name, event.target.value)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <CodeBlock code={code} language="tsx" className="bb-controls__code" />
    </div>
  );
}
