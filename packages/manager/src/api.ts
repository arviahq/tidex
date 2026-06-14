import type { InteractionTest } from "@tide/core";

declare const __TIDE_PREVIEW_URL__: string;

export const PREVIEW_URL =
  typeof __TIDE_PREVIEW_URL__ !== "undefined" ? __TIDE_PREVIEW_URL__ : "http://localhost:6007";

export const PREVIEW_MESSAGE = {
  UPDATE_ARGS: "TIDE_UPDATE_ARGS",
  SELECT_STORY: "TIDE_SELECT_STORY",
  READY: "TIDE_READY",
  SET_THEME: "TIDE_SET_THEME",
  // Variant tiles report their natural content size to the manager (iframe -> parent),
  // which replies with the shared fit bounds so every tile uses one scale factor.
  CONTENT_SIZE: "TIDE_CONTENT_SIZE",
  SET_FIT_BOUNDS: "TIDE_SET_FIT_BOUNDS",
  // Interaction tests: manager -> preview to run a list of steps; preview -> manager
  // with the result of each step (live) and a final done signal.
  RUN_TEST: "TIDE_RUN_TEST",
  TEST_STEP: "TIDE_TEST_STEP",
  TEST_DONE: "TIDE_TEST_DONE",
} as const;

export interface Manifest {
  components: Array<{
    name: string;
    path: string;
    exportName: string;
    title: string;
    isDefault?: boolean;
  }>;
}

export type PropSchema =
  | { type: "boolean"; required?: boolean }
  | { type: "string"; required?: boolean }
  | { type: "number"; required?: boolean }
  | { type: "union"; values: string[]; required?: boolean }
  | { type: "object"; properties: Record<string, PropSchema>; required?: boolean }
  | { type: "unknown"; required?: boolean };

export type PropsMap = Record<string, Record<string, PropSchema>>;

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch("/__tide/manifest.json");
  if (!res.ok) throw new Error("Failed to load manifest");
  return res.json();
}

export async function fetchProps(): Promise<PropsMap> {
  const res = await fetch("/__tide/props.json");
  if (!res.ok) throw new Error("Failed to load props");
  return res.json();
}

export async function fetchTokens(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("/__tide/tokens.json");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function postToPreview(
  iframe: HTMLIFrameElement | null,
  message: { type: string; payload?: unknown },
) {
  iframe?.contentWindow?.postMessage(message, "*");
}

export async function fetchTest(name: string): Promise<InteractionTest | null> {
  try {
    const res = await fetch(`/__tide/tests/${name}.json`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function saveTest(component: string, test: InteractionTest): Promise<void> {
  const res = await fetch("/__tide/tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ component, test }),
  });
  if (!res.ok) throw new Error(`Failed to save test (${res.status})`);
}
