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
  ARG_CHANGED: "TIDE_ARG_CHANGED",
  ACTION: "TIDE_ACTION",
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
  | { type: "callback"; updates?: string; required?: boolean }
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

export interface VisualReportEntry {
  changed: boolean;
  pixelsChanged: number;
  diffPath?: string;
  currentPath?: string;
  sizeMismatch?: boolean;
}

export type VisualReport = Record<string, VisualReportEntry>;

export interface VisualTestResponse {
  ok: boolean;
  entry?: VisualReportEntry;
  hasBaseline?: boolean;
  error?: string;
}

export function buildVisualPreviewUrl(
  component: string,
  args: Record<string, unknown>,
  theme: "light" | "dark",
): string {
  const params = new URLSearchParams();
  params.set("story", component);
  params.set("visual", "1");
  params.set("theme", theme);
  if (Object.keys(args).length > 0) {
    params.set("args", JSON.stringify(args));
  }
  return `${PREVIEW_URL}?${params.toString()}`;
}

export async function fetchVisualReport(): Promise<VisualReport> {
  try {
    const res = await fetch("/__tide/visual/report.json");
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export async function checkVisualBaseline(component: string): Promise<boolean> {
  try {
    const res = await fetch(`/__tide/baselines/${component}.png`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function postVisual(
  path: "/__tide/visual/run" | "/__tide/visual/update",
  component: string,
  args: Record<string, unknown>,
  theme: "light" | "dark",
): Promise<VisualTestResponse> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ component, args, theme }),
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error — is tide dev running?",
    };
  }

  const text = await res.text();
  let data: VisualTestResponse = { ok: false };

  if (text) {
    try {
      data = JSON.parse(text) as VisualTestResponse;
    } catch {
      data = {
        ok: false,
        error: text.slice(0, 200) || `Visual test failed (${res.status})`,
      };
    }
  } else if (!res.ok) {
    data = {
      ok: false,
      error:
        res.status === 404
          ? "Visual API not found — restart tide dev to load the latest version"
          : `Visual test failed (${res.status})`,
    };
  }

  if (!res.ok && !data.error) {
    data.error = `Visual test failed (${res.status})`;
  }
  if (data.ok === undefined) {
    data.ok = res.ok && !data.error;
  }

  return data;
}

export async function runVisualTest(
  component: string,
  args: Record<string, unknown>,
  theme: "light" | "dark",
): Promise<VisualTestResponse> {
  return postVisual("/__tide/visual/run", component, args, theme);
}

export async function updateVisualBaseline(
  component: string,
  args: Record<string, unknown>,
  theme: "light" | "dark",
): Promise<VisualTestResponse> {
  return postVisual("/__tide/visual/update", component, args, theme);
}
