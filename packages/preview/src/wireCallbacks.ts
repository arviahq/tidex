import { useEffect, useMemo, useRef, useState } from "react";
import type { ExtractStrategy, InteractionRecord } from "@tidex/core";

export type { InteractionRecord };

/**
 * Callback→state wiring map. Each entry maps a callback prop to the state prop
 * it updates (`updates`) and how to extract the next value from the handler's
 * arguments (`strategy`, default `first-arg`). `{}` (no `updates`) means
 * action-only and is wired to a no-op so the component never calls `undefined`.
 * Entries are inferred by Tidex and/or authored in the Interactions tab.
 */
export type CallbackMap = Record<string, { updates?: string; strategy?: ExtractStrategy }>;

/** Extract the controlled prop's next value from a fired handler's arguments. */
export function extractNext(
  strategy: ExtractStrategy | undefined,
  args: unknown[],
  prev: unknown,
): unknown {
  const first = args[0] as { target?: { value?: unknown; checked?: unknown } } | undefined;
  switch (strategy) {
    case "event-value":
      return first?.target?.value;
    case "event-checked":
      return first?.target?.checked;
    case "updater":
      return typeof args[0] === "function" ? (args[0] as (p: unknown) => unknown)(prev) : args[0];
    case "toggle":
      return !prev;
    case "constant-true":
      return true;
    case "constant-false":
      return false;
    default:
      // first-arg, object, set, map
      return args[0];
  }
}

/** Short, structured-clone-free summary of a value for the interaction log. */
export function summarizeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "function") return "fn";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Set) return `Set(${value.size})`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown> & { $$typeof?: symbol; target?: unknown };
    if (obj.$$typeof) return "ReactElement";
    const target = obj.target as
      | { tagName?: string; value?: unknown; checked?: unknown }
      | undefined;
    if (target?.tagName) {
      const detail = target.value ?? target.checked;
      return `${target.tagName.toLowerCase()}[${JSON.stringify(detail)}]`;
    }
    if (Array.isArray(value)) return `[${value.length}]`;
    try {
      return JSON.stringify(value);
    } catch {
      return "object";
    }
  }
  return String(value);
}

/** Whether a value is safe to send raw over postMessage (structured clone). */
function isCloneable(value: unknown): boolean {
  if (typeof value === "function" || typeof value === "symbol") return false;
  if (value && typeof value === "object") {
    const obj = value as { $$typeof?: symbol; nativeEvent?: unknown };
    if (obj.$$typeof || obj.nativeEvent) return false; // React element / synthetic event
  }
  return true;
}

function argsKey(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args);
  } catch {
    return String(Object.keys(args));
  }
}

function applyCallbacks(
  baseArgs: Record<string, unknown>,
  callbacks: CallbackMap | undefined,
  setOverride: (key: string, value: unknown) => void,
  onInteraction?: (record: InteractionRecord) => void,
): Record<string, unknown> {
  if (!callbacks || Object.keys(callbacks).length === 0) return baseArgs;

  const result = { ...baseArgs };
  for (const [name, meta] of Object.entries(callbacks)) {
    const original = result[name];
    const updates = meta?.updates;
    result[name] = (...handlerArgs: unknown[]) => {
      const prev = updates !== undefined ? baseArgs[updates] : undefined;
      const next =
        updates !== undefined ? extractNext(meta?.strategy, handlerArgs, prev) : undefined;
      if (updates !== undefined) setOverride(updates, next);
      // Preserve a real handler the story already provides (side effects, etc.).
      if (typeof original === "function") {
        try {
          (original as (...a: unknown[]) => unknown)(...handlerArgs);
        } catch {
          /* user handler threw — keep the preview alive */
        }
      }
      onInteraction?.({
        handler: name,
        stateProp: updates,
        argsSummary: handlerArgs.map(summarizeValue).join(", "),
        prevSummary: updates !== undefined ? summarizeValue(prev) : undefined,
        nextSummary: updates !== undefined ? summarizeValue(next) : undefined,
        next: updates !== undefined && isCloneable(next) ? next : undefined,
      });
    };
  }
  return result;
}

/**
 * Merge base args with local interaction overrides and the callback wiring. A
 * mapped callback extracts the next value (per its strategy), updates local
 * state, re-renders the preview, and reports the interaction via `onInteraction`.
 */
export function useWiredArgs(
  baseArgs: Record<string, unknown>,
  callbacks: CallbackMap | undefined,
  onInteraction?: (record: InteractionRecord) => void,
): Record<string, unknown> {
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  const baseKeyRef = useRef(argsKey(baseArgs));

  // Drop local overrides when the base args change (story switch, control edit)
  // so the preview reflects the new declarative state instead of stale clicks.
  useEffect(() => {
    const nextKey = argsKey(baseArgs);
    if (nextKey !== baseKeyRef.current) {
      baseKeyRef.current = nextKey;
      setOverrides({});
    }
  }, [baseArgs]);

  const merged = useMemo(() => ({ ...baseArgs, ...overrides }), [baseArgs, overrides]);

  return useMemo(
    () =>
      applyCallbacks(
        merged,
        callbacks,
        (key, value) => setOverrides((prev) => ({ ...prev, [key]: value })),
        onInteraction,
      ),
    [merged, callbacks, onInteraction],
  );
}

/**
 * Non-hook variant for the interaction-test remount path, where the component
 * is mounted imperatively. Mutates a local copy of args on each callback so a
 * test driving clicks observes the same state updates as the live preview.
 */
export function buildWiredArgs(
  baseArgs: Record<string, unknown>,
  callbacks: CallbackMap | undefined,
): Record<string, unknown> {
  const result = { ...baseArgs };
  if (!callbacks) return result;
  for (const [name, meta] of Object.entries(callbacks)) {
    const original = result[name];
    const updates = meta?.updates;
    result[name] = (...handlerArgs: unknown[]) => {
      if (updates !== undefined) {
        result[updates] = extractNext(meta?.strategy, handlerArgs, result[updates]);
      }
      if (typeof original === "function") {
        try {
          (original as (...a: unknown[]) => unknown)(...handlerArgs);
        } catch {
          /* ignore */
        }
      }
    };
  }
  return result;
}
