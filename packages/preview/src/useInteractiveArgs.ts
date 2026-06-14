import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CallbackMeta } from "@tide/core";

export interface InteractiveArgsOptions {
  onArgChanged?: (key: string, value: unknown) => void;
  onAction?: (name: string, args: unknown[]) => void;
}

function argsKey(args: Record<string, unknown>): string {
  return JSON.stringify(args);
}

/**
 * Merge manager args with local interaction overrides and auto-wired callback handlers.
 */
export function useInteractiveArgs(
  baseArgs: Record<string, unknown>,
  callbacks: Record<string, CallbackMeta> | undefined,
  options: InteractiveArgsOptions = {},
): Record<string, unknown> {
  const { onArgChanged, onAction } = options;
  const [localOverrides, setLocalOverrides] = useState<Record<string, unknown>>({});
  const baseKeyRef = useRef(argsKey(baseArgs));

  useEffect(() => {
    const nextKey = argsKey(baseArgs);
    if (nextKey !== baseKeyRef.current) {
      baseKeyRef.current = nextKey;
      setLocalOverrides({});
    }
  }, [baseArgs]);

  const mergedBase = useMemo(
    () => ({ ...baseArgs, ...localOverrides }),
    [baseArgs, localOverrides],
  );

  const updateState = useCallback(
    (stateKey: string, value: unknown) => {
      setLocalOverrides((prev) => ({ ...prev, [stateKey]: value }));
      onArgChanged?.(stateKey, value);
    },
    [onArgChanged],
  );

  return useMemo(() => {
    if (!callbacks || Object.keys(callbacks).length === 0) {
      return mergedBase;
    }

    const result = { ...mergedBase };
    for (const [name, meta] of Object.entries(callbacks)) {
      if (typeof result[name] === "function") continue;

      const updates = meta.updates;
      result[name] = (...handlerArgs: unknown[]) => {
        if (updates !== undefined && handlerArgs.length > 0) {
          updateState(updates, handlerArgs[0]);
        }
        onAction?.(name, handlerArgs);
      };
    }
    return result;
  }, [callbacks, mergedBase, onAction, updateState]);
}

/**
 * Build interactive args outside of React (e.g. interaction test remount).
 */
export function buildInteractiveArgs(
  baseArgs: Record<string, unknown>,
  callbacks: Record<string, CallbackMeta> | undefined,
  options: InteractiveArgsOptions = {},
): Record<string, unknown> {
  if (!callbacks || Object.keys(callbacks).length === 0) {
    return baseArgs;
  }

  const result = { ...baseArgs };
  for (const [name, meta] of Object.entries(callbacks)) {
    if (typeof result[name] === "function") continue;

    const updates = meta.updates;
    result[name] = (...handlerArgs: unknown[]) => {
      if (updates !== undefined && handlerArgs.length > 0) {
        result[updates] = handlerArgs[0];
        options.onArgChanged?.(updates, handlerArgs[0]);
      }
      options.onAction?.(name, handlerArgs);
    };
  }
  return result;
}
