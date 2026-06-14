import { useMemo } from "react";
import type { CallbackMap, PropSchema } from "../api";
import "./interactions.css";

interface InteractionsPanelProps {
  componentName: string;
  props: Record<string, PropSchema>;
  callbacks: CallbackMap;
  onChange: (next: CallbackMap) => void;
}

const ACTION_ONLY = "";

export function InteractionsPanel({
  componentName,
  props,
  callbacks,
  onChange,
}: InteractionsPanelProps) {
  const callbackNames = useMemo(
    () =>
      Object.entries(props)
        .filter(([, schema]) => schema.type === "callback")
        .map(([name]) => name),
    [props],
  );

  // Any non-callback prop is a candidate target the callback can update.
  const targets = useMemo(
    () =>
      Object.entries(props)
        .filter(([, schema]) => schema.type !== "callback")
        .map(([name]) => name),
    [props],
  );

  if (callbackNames.length === 0) {
    return <p className="bb-interactions__empty">No function props detected on {componentName}.</p>;
  }

  const setUpdates = (callback: string, value: string) => {
    onChange({
      ...callbacks,
      [callback]: value === ACTION_ONLY ? {} : { updates: value },
    });
  };

  return (
    <div className="bb-interactions">
      <p className="bb-interactions__hint">
        Map each callback to the prop it updates so the preview reacts to it. Saved to{" "}
        <code>.tide/interactions/{componentName}.json</code>.
      </p>
      <div className="bb-interactions__list">
        {callbackNames.map((name) => {
          const current = callbacks[name]?.updates ?? ACTION_ONLY;
          return (
            <div key={name} className="bb-interactions__row">
              <span className="bb-interactions__name">{name}</span>
              <span className="bb-interactions__arrow" aria-hidden="true">
                updates →
              </span>
              <select
                className="bb-interactions__select"
                aria-label={`${name} updates`}
                value={current}
                onChange={(event) => setUpdates(name, event.target.value)}
              >
                <option value={ACTION_ONLY}>(action only)</option>
                {targets.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
