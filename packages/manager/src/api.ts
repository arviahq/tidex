import type {
  BindingsMap,
  ComponentEntry,
  ExtractStrategy,
  InteractionBinding,
  InteractionRecord,
  InteractionTest,
  InteractionWiring,
} from "@tidex/core";

export type CallbackMap = Record<string, { updates?: string; strategy?: ExtractStrategy }>;
export type { ExtractStrategy, InteractionBinding, InteractionRecord, BindingsMap };

declare const __TIDEX_PREVIEW_URL__: string;

export const PREVIEW_URL =
  typeof __TIDEX_PREVIEW_URL__ !== "undefined" ? __TIDEX_PREVIEW_URL__ : "http://localhost:6007";

export const PREVIEW_MESSAGE = {
  UPDATE_ARGS: "TIDEX_UPDATE_ARGS",
  SELECT_STORY: "TIDEX_SELECT_STORY",
  READY: "TIDEX_READY",
  SET_THEME: "TIDEX_SET_THEME",
  // Variant tiles report their natural content size to the manager (iframe -> parent),
  // which replies with the shared fit bounds so every tile uses one scale factor.
  CONTENT_SIZE: "TIDEX_CONTENT_SIZE",
  SET_FIT_BOUNDS: "TIDEX_SET_FIT_BOUNDS",
  // Interaction tests: manager -> preview to run a list of steps; preview -> manager
  // with the result of each step (live) and a final done signal.
  RUN_TEST: "TIDEX_RUN_TEST",
  TEST_STEP: "TIDEX_TEST_STEP",
  TEST_DONE: "TIDEX_TEST_DONE",
  // manager -> preview: explicit callback→state wiring for the current story.
  SET_CALLBACKS: "TIDEX_SET_CALLBACKS",
  INTERACTION: "TIDEX_INTERACTION",
  // manager -> preview: canvas view state (zoom, forced pseudo-states, element
  // outlines, background grid) from the preview toolbar.
  SET_VIEW: "TIDEX_SET_VIEW",
  // manager -> preview: re-mount the current story from scratch (resets state).
  RELOAD: "TIDEX_RELOAD",
} as const;

export interface Manifest {
  components: ComponentEntry[];
}

export interface TidexConfigSnapshot {
  packageName: string | null;
  defaults: Record<string, Record<string, unknown>>;
  componentsDir: string | null;
}

export interface ScanReport {
  warnings: string[];
  duplicateNames: Array<{ name: string; ids: string[]; paths: string[] }>;
  filesWithNoComponents: string[];
  componentsWithNoProps: string[];
  componentsWithUnknownProps: Array<{
    id: string;
    name: string;
    unknownCount: number;
    props: Array<{ name: string; typeText?: string }>;
  }>;
}

// Re-export the canonical prop schema types from core so the manager never
// drifts from the scanner's output.
import type { PropSchema, PropsMap } from "@tidex/core";
export type { PropSchema, PropsMap };

function tideArtifactPath(kind: string, componentId: string, ext: string): string {
  const segments = componentId.split("/").map(encodeURIComponent).join("/");
  return `/__tidex/${kind}/${segments}.${ext}`;
}

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch("/__tidex/manifest.json");
  if (!res.ok) throw new Error("Failed to load manifest");
  const data = (await res.json()) as Manifest;
  return {
    components: data.components.map((component) => ({
      ...component,
      id: component.id ?? component.name,
    })),
  };
}

export async function fetchProps(): Promise<PropsMap> {
  const res = await fetch("/__tidex/props.json");
  if (!res.ok) throw new Error("Failed to load props");
  return res.json();
}

export async function fetchTokens(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("/__tidex/tokens.json");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchConfigSnapshot(): Promise<TidexConfigSnapshot | null> {
  try {
    const res = await fetch("/__tidex/config.json");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchScanReport(): Promise<ScanReport | null> {
  try {
    const res = await fetch("/__tidex/scan-report.json");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Tidex's inferred interaction bindings (state prop ↔ change handler), per component id. */
export async function fetchBindings(): Promise<BindingsMap> {
  try {
    const res = await fetch("/__tidex/bindings.json");
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export function postToPreview(
  iframe: HTMLIFrameElement | null,
  message: { type: string; payload?: unknown },
) {
  iframe?.contentWindow?.postMessage(message, "*");
}

export async function fetchTest(componentId: string): Promise<InteractionTest | null> {
  try {
    const res = await fetch(tideArtifactPath("tests", componentId, "json"));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function saveTest(component: string, test: InteractionTest): Promise<void> {
  const res = await fetch("/__tidex/tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ component, test }),
  });
  if (!res.ok) throw new Error(`Failed to save test (${res.status})`);
}

export async function fetchInteractions(componentId: string): Promise<CallbackMap> {
  try {
    const res = await fetch(tideArtifactPath("interactions", componentId, "json"));
    if (!res.ok) return {};
    const wiring = (await res.json()) as InteractionWiring;
    return wiring.callbacks ?? {};
  } catch {
    return {};
  }
}

export async function saveInteractions(component: string, callbacks: CallbackMap): Promise<void> {
  const wiring: InteractionWiring = { component, callbacks };
  const res = await fetch("/__tidex/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ component, wiring }),
  });
  if (!res.ok) throw new Error(`Failed to save interactions (${res.status})`);
}

export type VisualLayerKey = "screenshot" | "styles" | "dom" | "layout" | "a11y";
export type VisualClassification = "identical" | "semantic" | "pixel-noise";

export interface VisualLayerSummary {
  changed: boolean;
  count: number;
}

export interface VisualDiffSummary {
  layers: Record<VisualLayerKey, VisualLayerSummary>;
  semanticChanged: boolean;
  classification: VisualClassification;
  verdict: string;
}

export interface DomAttrChange {
  name: string;
  from?: string;
  to?: string;
}
export interface DomNodeChange {
  key: string;
  tag: string;
  label?: string;
  attrs?: DomAttrChange[];
  classes?: { added: string[]; removed: string[] };
  text?: { from?: string; to?: string };
}
export interface DomDiff {
  added: { key: string; tag: string }[];
  removed: { key: string; tag: string }[];
  moved: { fromKey: string; toKey: string; tag: string }[];
  changed: DomNodeChange[];
}
export interface StylePropChange {
  prop: string;
  from: string;
  to: string;
  isColor: boolean;
}
export interface StyleNodeChange {
  nodeKey: string;
  label?: string;
  props: StylePropChange[];
}
export interface StyleDiff {
  nodes: StyleNodeChange[];
  totalProps: number;
}
export interface LayoutNodeChange {
  nodeKey: string;
  label?: string;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  phrase: string;
}
export interface LayoutDiff {
  nodes: LayoutNodeChange[];
  tolerancePx: number;
}
export interface A11yChange {
  kind: "added" | "removed";
  line: string;
}
export interface A11yDiff {
  changes: A11yChange[];
}
export interface PropChange {
  name: string;
  from?: unknown;
  to?: unknown;
}
export interface PropsDiff {
  changed: PropChange[];
}
export interface VisualDiffDetail {
  storyId: string;
  summary: VisualDiffSummary;
  props: PropsDiff;
  dom: DomDiff;
  styles: StyleDiff;
  layout: LayoutDiff;
  a11y: A11yDiff;
}

export interface VisualReportEntry {
  changed: boolean;
  pixelsChanged: number;
  diffPath?: string;
  currentPath?: string;
  sizeMismatch?: boolean;
  snapshotPath?: string;
  summary?: VisualDiffSummary;
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
    // never serve a stale report — it drives which images the panel shows.
    const res = await fetch("/__tidex/visual/report.json", { cache: "no-store" });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export async function fetchVisualDiffDetail(componentId: string): Promise<VisualDiffDetail | null> {
  try {
    const encoded = componentId.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(`/__tidex/reports/${encoded}-diff.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as VisualDiffDetail;
  } catch {
    return null;
  }
}

export async function checkVisualBaseline(componentId: string): Promise<boolean> {
  try {
    const res = await fetch(tideArtifactPath("baselines", componentId, "png"), {
      method: "HEAD",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function postVisual(
  path: "/__tidex/visual/run" | "/__tidex/visual/update",
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
      error: err instanceof Error ? err.message : "Network error — is tidex dev running?",
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
          ? "Visual API not found — restart tidex dev to load the latest version"
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
  return postVisual("/__tidex/visual/run", component, args, theme);
}

export async function updateVisualBaseline(
  component: string,
  args: Record<string, unknown>,
  theme: "light" | "dark",
): Promise<VisualTestResponse> {
  return postVisual("/__tidex/visual/update", component, args, theme);
}
