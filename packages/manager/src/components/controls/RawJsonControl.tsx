import { useEffect, useState } from "react";
import type { ControlNodeProps } from "./types";
import { jsonTextToValue, valueToJsonText } from "./helpers";

/**
 * The universal escape hatch: edit any value as raw JSON. Set/Map/Date are
 * shown in their lowered forms and re-hydrated on parse. Invalid JSON is kept
 * locally (with an inline error) without pushing a broken value upstream.
 */
export function RawJsonControl({ schema, value, onChange }: ControlNodeProps) {
  const [text, setText] = useState(() => valueToJsonText(schema, value));
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Re-sync from upstream when the value changes externally (story switch,
  // two-way sync) — but never clobber what the user is actively typing.
  useEffect(() => {
    if (!dirty) setText(valueToJsonText(schema, value));
  }, [value, schema, dirty]);

  return (
    <div className="bb-controls__raw">
      <textarea
        className="bb-controls__input bb-controls__textarea bb-controls__raw-text"
        spellCheck={false}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          setDirty(true);
          try {
            onChange(jsonTextToValue(schema, next));
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid JSON");
          }
        }}
        onBlur={() => setDirty(false)}
      />
      {error ? <span className="bb-controls__error">{error}</span> : null}
    </div>
  );
}
