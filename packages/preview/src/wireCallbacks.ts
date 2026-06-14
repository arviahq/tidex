import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Explicit callback→state wiring map, authored in the manager's Interactions
 * tab and persisted at `.tide/interactions/<Component>.json`. Each entry maps a
 * callback prop name to the state prop it updates; `{}` (no `updates`) means
 * action-only and is wired to a no-op so the component never calls `undefined`.
 */
export type CallbackMap = Record<string, { updates?: string }>;

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
): Record<string, unknown> {
  if (!callbacks || Object.keys(callbacks).length === 0) return baseArgs;

  const result = { ...baseArgs };
  for (const [name, meta] of Object.entries(callbacks)) {
    // Respect an explicit function the story already provides.
    if (typeof result[name] === "function") continue;
    const updates = meta?.updates;
    result[name] =
      updates !== undefined
        ? (...handlerArgs: unknown[]) => setOverride(updates, handlerArgs[0])
        : () => {};
  }
  return result;
}

/**
 * Merge base args with local interaction overrides and the explicit callback
 * wiring. A mapped callback updates local state and re-renders the preview;
 * unmapped callbacks are no-ops. Purely local — no postMessage back to the
 * manager.
 */
export function useWiredArgs(
  baseArgs: Record<string, unknown>,
  callbacks: CallbackMap | undefined,
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
      applyCallbacks(merged, callbacks, (key, value) =>
        setOverrides((prev) => ({ ...prev, [key]: value })),
      ),
    [merged, callbacks],
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
    if (typeof result[name] === "function") continue;
    const updates = meta?.updates;
    result[name] =
      updates !== undefined
        ? (...handlerArgs: unknown[]) => {
            result[updates] = handlerArgs[0];
          }
        : () => {};
  }
  return result;
}
