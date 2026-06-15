import { useMemo } from "react";
import { formatDisplayName } from "@tide/core";
import type { CallbackMap, PropSchema } from "../api";
import "./interactions.css";

interface InteractionsPanelProps {
  componentName: string;
  props: Record<string, PropSchema>;
  callbacks: CallbackMap;
  onChange: (next: CallbackMap) => void;
}

const ACTION_ONLY = "";

function FnGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.4 3c-1.2 0-1.7.5-1.7 1.7v1c0 .9-.3 1.4-1.1 1.6.8.2 1.1.7 1.1 1.6v1c0 1.2.5 1.7 1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 3c1.2 0 1.7.5 1.7 1.7v1c0 .9.3 1.4 1.1 1.6-.8.2-1.1.7-1.1 1.6v1c0 1.2-.5 1.7-1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h9M9 4.5 12.5 8 9 11.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

  const setUpdates = (callback: string, value: string) => {
    onChange({
      ...callbacks,
      [callback]: value === ACTION_ONLY ? {} : { updates: value },
    });
  };

  const wiredCount = callbackNames.filter((name) => callbacks[name]?.updates).length;

  return (
    <div className="bb-interactions">
      <header className="bb-interactions__header">
        <div className="bb-interactions__title-block">
          <h2 className="bb-interactions__name-title">{formatDisplayName(componentName)}</h2>
          <p className="bb-interactions__subtitle">
            Callback wiring · saved to .tide/interactions/{componentName}.json
          </p>
        </div>
        {callbackNames.length > 0 && (
          <span className="bb-interactions__summary">
            {wiredCount}/{callbackNames.length} wired
          </span>
        )}
      </header>

      {callbackNames.length === 0 ? (
        <div className="bb-interactions__empty">
          <span className="bb-interactions__empty-icon" aria-hidden="true">
            <FnGlyph />
          </span>
          <p className="bb-interactions__empty-text">
            No function props detected on <strong>{formatDisplayName(componentName)}</strong>.
            Callback props like <code>onClick</code> or <code>onChange</code> appear here so you can
            wire them to state.
          </p>
        </div>
      ) : (
        <section className="bb-interactions__section">
          <div className="bb-interactions__section-head">
            <h3 className="bb-interactions__section-title">Callbacks</h3>
            <span className="bb-interactions__section-count">{callbackNames.length}</span>
          </div>
          <p className="bb-interactions__hint">
            Map each callback to the prop it updates so the live preview reacts when it fires.
          </p>
          <div className="bb-interactions__list">
            {callbackNames.map((name) => {
              const current = callbacks[name]?.updates ?? ACTION_ONLY;
              return (
                <div key={name} className="bb-interactions__row">
                  <span className="bb-interactions__name-cell">
                    <span className="bb-interactions__fn-chip" aria-hidden="true">
                      <FnGlyph />
                    </span>
                    <span className="bb-interactions__name">{name}</span>
                  </span>
                  <span className="bb-interactions__arrow" aria-hidden="true">
                    updates
                    <ArrowGlyph />
                  </span>
                  <select
                    className="bb-interactions__select"
                    data-empty={current === ACTION_ONLY ? "true" : undefined}
                    aria-label={`${name} updates`}
                    value={current}
                    onChange={(event) => setUpdates(name, event.target.value)}
                  >
                    <option value={ACTION_ONLY}>action only</option>
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
        </section>
      )}
    </div>
  );
}
