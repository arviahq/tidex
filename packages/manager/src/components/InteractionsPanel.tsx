import { useMemo } from "react";
import { formatDisplayName } from "@tide/core";
import type {
  CallbackMap,
  ExtractStrategy,
  InteractionBinding,
  InteractionRecord,
  PropSchema,
} from "../api";
import "./interactions.css";

interface InteractionsPanelProps {
  componentName: string;
  props: Record<string, PropSchema>;
  /** User-authored wiring (overrides inferred). */
  callbacks: CallbackMap;
  /** Tide's inferred bindings for this component. */
  bindings: InteractionBinding[];
  /** Live interaction records (most-recent first). */
  log: InteractionRecord[];
  onChange: (next: CallbackMap) => void;
}

const ACTION_ONLY = "";

const STRATEGIES: ExtractStrategy[] = [
  "first-arg",
  "event-value",
  "event-checked",
  "updater",
  "toggle",
  "constant-true",
  "constant-false",
  "object",
  "set",
  "map",
];

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
  bindings,
  log,
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

  const inferred = useMemo(
    () => Object.fromEntries(bindings.map((b) => [b.handler, b])),
    [bindings],
  );

  // The effective wiring for a handler: the user's override if present,
  // otherwise Tide's inferred binding.
  const resolve = (name: string) => {
    const userEntry = Object.prototype.hasOwnProperty.call(callbacks, name)
      ? callbacks[name]
      : undefined;
    if (userEntry) {
      return {
        updates: userEntry.updates ?? ACTION_ONLY,
        strategy: userEntry.strategy ?? "first-arg",
        origin: "manual" as const,
        confidence: undefined,
      };
    }
    const b = inferred[name];
    return {
      updates: b?.stateProp ?? ACTION_ONLY,
      strategy: b?.strategy ?? "first-arg",
      origin: b ? ("auto" as const) : ("none" as const),
      confidence: b?.confidence,
    };
  };

  const setUpdates = (name: string, value: string) => {
    const { strategy } = resolve(name);
    onChange({
      ...callbacks,
      [name]: value === ACTION_ONLY ? {} : { updates: value, strategy },
    });
  };

  const setStrategy = (name: string, strategy: ExtractStrategy) => {
    const { updates } = resolve(name);
    onChange({
      ...callbacks,
      [name]: updates === ACTION_ONLY ? {} : { updates, strategy },
    });
  };

  const wiredCount = callbackNames.filter((name) => resolve(name).updates !== ACTION_ONLY).length;

  return (
    <div className="bb-interactions">
      <header className="bb-interactions__header">
        <div className="bb-interactions__title-block">
          <h2 className="bb-interactions__name-title">{formatDisplayName(componentName)}</h2>
          <p className="bb-interactions__subtitle">
            Auto-wired interactions · overrides saved to .tide/interactions/{componentName}.json
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
          </p>
        </div>
      ) : (
        <section className="bb-interactions__section">
          <div className="bb-interactions__section-head">
            <h3 className="bb-interactions__section-title">Interactive props</h3>
            <span className="bb-interactions__section-count">{callbackNames.length}</span>
          </div>
          <p className="bb-interactions__hint">
            Tide wires these automatically. Change the target prop or extraction strategy to
            override, or set a handler to <em>action only</em> to disconnect it.
          </p>
          <div className="bb-interactions__list">
            {callbackNames.map((name) => {
              const { updates, strategy, origin, confidence } = resolve(name);
              return (
                <div key={name} className="bb-interactions__row">
                  <span className="bb-interactions__name-cell">
                    <span className="bb-interactions__fn-chip" aria-hidden="true">
                      <FnGlyph />
                    </span>
                    <span className="bb-interactions__name">{name}</span>
                    {origin === "auto" && confidence ? (
                      <span className="bb-interactions__badge" data-confidence={confidence}>
                        auto · {confidence}
                      </span>
                    ) : origin === "manual" ? (
                      <span className="bb-interactions__badge" data-confidence="manual">
                        manual
                      </span>
                    ) : null}
                  </span>
                  <span className="bb-interactions__arrow" aria-hidden="true">
                    updates
                    <ArrowGlyph />
                  </span>
                  <select
                    className="bb-interactions__select"
                    data-empty={updates === ACTION_ONLY ? "true" : undefined}
                    aria-label={`${name} updates`}
                    value={updates}
                    onChange={(event) => setUpdates(name, event.target.value)}
                  >
                    <option value={ACTION_ONLY}>action only</option>
                    {targets.map((target) => (
                      <option key={target} value={target}>
                        {target}
                      </option>
                    ))}
                  </select>
                  <select
                    className="bb-interactions__select bb-interactions__select--strategy"
                    aria-label={`${name} strategy`}
                    value={strategy}
                    disabled={updates === ACTION_ONLY}
                    onChange={(event) => setStrategy(name, event.target.value as ExtractStrategy)}
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {log.length > 0 && (
        <section className="bb-interactions__section">
          <div className="bb-interactions__section-head">
            <h3 className="bb-interactions__section-title">Interaction log</h3>
            <span className="bb-interactions__section-count">{log.length}</span>
          </div>
          <ul className="bb-interactions__log">
            {log.map((entry, i) => (
              <li key={i} className="bb-interactions__log-row">
                <code className="bb-interactions__log-call">
                  {entry.handler}({entry.argsSummary})
                </code>
                <span className="bb-interactions__log-effect">
                  {entry.stateProp ? (
                    <>
                      {entry.stateProp}: {entry.prevSummary} → {entry.nextSummary}
                    </>
                  ) : (
                    <span data-muted="true">no controlled prop</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
