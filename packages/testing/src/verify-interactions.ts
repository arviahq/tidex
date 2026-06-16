import fs from "node:fs";
import path from "node:path";
import {
  coerceUnionValue,
  getComponentId,
  getVerifyReportPath,
  type BindingsMap,
  type BindingVerification,
  type InteractionBinding,
  type InteractionVerifyEntry,
  type InteractionVerifyReport,
  type Manifest,
  type PropSchema,
  type PropsMap,
} from "@tidex/core";
import type { Page } from "playwright";
import { createTestBrowser, createTestPage, type TestBrowser } from "./browser.js";
import { gotoStory, ROOT_SELECTOR } from "./navigation.js";
import { defaultWorkers, mapPool } from "./pool.js";

const ACTION_TIMEOUT = 3000;

/** Canonical state-prop → display name; falls back to a capitalized prop. */
const STATE_NAMES: Record<string, string> = {
  open: "Open",
  visible: "Open",
  checked: "Checked",
  active: "Active",
  expanded: "Expanded",
  collapsed: "Collapsed",
  selected: "Selected",
  value: "Filled",
};

function stateName(prop: string): string {
  return STATE_NAMES[prop] ?? prop.charAt(0).toUpperCase() + prop.slice(1);
}

/** Strategies whose controlled prop is a boolean even when the schema is loose. */
const BOOLEAN_STRATEGIES = new Set(["toggle", "constant-true", "constant-false", "event-checked"]);

/**
 * Synthesize the args that drive a binding's interesting state (e.g. `checked:
 * true`, `value: "…"`), or `null` when the value can't be synthesized robustly
 * (numbers, sets, objects). Args-based so the state renders deterministically
 * without guessing which element to click.
 */
export function stateArgsFor(
  binding: InteractionBinding,
  schema: PropSchema | undefined,
): { name: string; args: Record<string, unknown> } | null {
  const { stateProp, strategy } = binding;

  if (schema?.type === "boolean") {
    return { name: stateName(stateProp), args: { [stateProp]: true } };
  }
  if (schema?.type === "string" && (strategy === "event-value" || strategy === "first-arg")) {
    return { name: "Filled", args: { [stateProp]: "Sample text" } };
  }
  if (schema?.type === "union" && schema.values.length > 0) {
    // Pick an option other than the default (index 0) so the state differs.
    const raw = schema.values[schema.values.length - 1]!;
    return {
      name: stateName(stateProp),
      args: { [stateProp]: coerceUnionValue(raw, schema.valueType) },
    };
  }
  if (BOOLEAN_STRATEGIES.has(strategy)) {
    return { name: stateName(stateProp), args: { [stateProp]: true } };
  }
  return null;
}

function buildUrl(
  previewUrl: string,
  storyId: string,
  args?: Record<string, unknown>,
  bindings?: boolean,
): string {
  const params = new URLSearchParams();
  params.set("story", storyId);
  if (args && Object.keys(args).length > 0) params.set("args", JSON.stringify(args));
  if (bindings) params.set("bindings", "1");
  return `${previewUrl}?${params.toString()}`;
}

async function ariaSnapshot(page: Page): Promise<string> {
  try {
    return await page.locator(ROOT_SELECTOR).first().ariaSnapshot();
  } catch {
    return "";
  }
}

/** Count of accessibility-snapshot lines that differ between two states. */
function ariaDelta(before: string, after: string): number {
  const a = new Set(before.split("\n").map((l) => l.trim()));
  const b = after.split("\n").map((l) => l.trim());
  let changed = 0;
  for (const line of b) if (line && !a.has(line)) changed++;
  const bSet = new Set(b);
  for (const line of a) if (line && !bSet.has(line)) changed++;
  return changed;
}

/**
 * Drive the component into its interacted state by acting on a plausible
 * trigger, scoped to the rendered root. Best-effort and role-based — returns a
 * label of what it did, or `null` when no trigger could be found.
 */
async function driveTrigger(
  page: Page,
  binding: InteractionBinding,
  schema: PropSchema | undefined,
): Promise<string | null> {
  const scope = page.locator(ROOT_SELECTOR).first();

  // Click the last visible+enabled match of a locator. Going last-first skips a
  // disabled leading control (e.g. a stepper's `−` at its minimum) and lands on
  // a non-default option (e.g. a toggle group's unselected button) so the state
  // actually moves rather than re-confirming the default.
  const clickBest = async (loc: ReturnType<Page["locator"]>): Promise<boolean> => {
    let items: Awaited<ReturnType<typeof loc.all>>;
    try {
      items = await loc.all();
    } catch {
      return false;
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const el = items[i]!;
      try {
        if ((await el.isVisible()) && (await el.isEnabled())) {
          await el.click({ timeout: ACTION_TIMEOUT });
          return true;
        }
      } catch {
        /* try the next candidate */
      }
    }
    return false;
  };

  // Text-driven props: fill the first textbox.
  if (binding.strategy === "event-value" || schema?.type === "string") {
    const textbox = scope.getByRole("textbox").first();
    try {
      if ((await textbox.count()) > 0 && (await textbox.isVisible())) {
        await textbox.fill("Tide", { timeout: ACTION_TIMEOUT });
        return "fill textbox";
      }
    } catch {
      /* fall through to clicking */
    }
  }

  // Otherwise click the primary control, preferring semantic roles.
  for (const role of ["checkbox", "switch", "radio", "tab", "option", "button"] as const) {
    if (await clickBest(scope.getByRole(role))) return `click ${role}`;
  }
  if (await clickBest(scope.locator('button, [role="button"], [tabindex], input'))) {
    return "click control";
  }
  return null;
}

export interface VerifyInteractionsOptions {
  root: string;
  previewUrl: string;
  manifest: Manifest;
  bindings: BindingsMap;
  props: PropsMap;
  /** Shared browser session (caller owns lifecycle when provided). */
  browser?: TestBrowser;
  /** Parallel component workers (default: min(4, CPU count)). */
  workers?: number;
  /** Reports per-component progress as `(done, total, label)`. */
  onProgress?: (done: number, total: number, label?: string) => void;
}

export interface VerifyInteractionsResult {
  report: InteractionVerifyReport;
  /** Bindings with confidence tuned by verification (medium↑high / medium↓low). */
  bindings: BindingsMap;
}

async function verifyComponent(
  page: Page,
  previewUrl: string,
  id: string,
  bindings: BindingsMap,
  props: PropsMap,
): Promise<[string, InteractionVerifyEntry, InteractionBinding[]]> {
  const list = bindings[id]!;
  const localTuned = list.map((b) => ({ ...b }));
  const componentProps = props[id] ?? {};
  const entry: InteractionVerifyEntry = { bindings: [], states: [] };
  const seenStates = new Set<string>();

  for (const binding of list) {
    // --- generated state (args-based) ---
    const state = stateArgsFor(binding, componentProps[binding.stateProp]);
    if (state && !seenStates.has(state.name)) {
      seenStates.add(state.name);
      const ok = await gotoStory(page, buildUrl(previewUrl, id, state.args));
      entry.states.push({
        name: state.name,
        args: state.args,
        ariaSnapshot: ok ? await ariaSnapshot(page) : undefined,
      });
    }

    // --- verification (interaction-based, preview self-wires) ---
    const verification: BindingVerification = {
      stateProp: binding.stateProp,
      handler: binding.handler,
      verified: null,
    };
    const loaded = await gotoStory(page, buildUrl(previewUrl, id, undefined, true));
    if (loaded) {
      const before = await ariaSnapshot(page);
      let trigger: string | null = null;
      try {
        trigger = await driveTrigger(page, binding, componentProps[binding.stateProp]);
      } catch {
        trigger = null;
      }
      if (trigger) {
        verification.trigger = trigger;
        await page.waitForTimeout(200);
        const after = await ariaSnapshot(page);
        const changed = ariaDelta(before, after);
        verification.verified = changed > 0;
        verification.delta = `${changed} a11y line(s) changed`;
      }
    }
    entry.bindings.push(verification);

    // --- tune confidence (only medium bindings; never demote high) ---
    const target = localTuned.find(
      (b) => b.handler === binding.handler && b.stateProp === binding.stateProp,
    );
    if (target && target.confidence === "medium" && verification.verified !== null) {
      target.confidence = verification.verified ? "high" : "low";
      target.source = "runtime";
    }
  }

  return [id, entry, localTuned];
}

/**
 * Headlessly verify each inferred binding and capture its generated state:
 *
 * - **Verification** — open the preview with `?bindings=1` so it self-wires,
 *   snapshot the accessible state, drive a plausible trigger, snapshot again,
 *   and record whether state actually moved. A confirmed change promotes a
 *   medium binding to high; a no-op demotes it to low. High convention bindings
 *   are never demoted (the trigger heuristic is best-effort).
 * - **Generated states** — render the binding's interesting state via args and
 *   record its aria snapshot as a checkpoint for visual/a11y review.
 *
 * Writes `.tidex/reports/interactions-verify.json` and returns tuned bindings.
 */
export async function verifyInteractions(
  options: VerifyInteractionsOptions,
): Promise<VerifyInteractionsResult> {
  const { root, previewUrl, manifest, bindings, props } = options;

  const tuned: BindingsMap = {};
  for (const [id, list] of Object.entries(bindings)) tuned[id] = list.map((b) => ({ ...b }));

  const ids = manifest.components
    .map((c) => getComponentId(c))
    .filter((id) => (bindings[id] ?? []).length > 0);

  const owned = !options.browser;
  const testBrowser = options.browser ?? (await createTestBrowser());
  const workers = defaultWorkers(options.workers);
  let done = 0;

  try {
    const entries = await mapPool(ids, workers, async (id) => {
      const page = await createTestPage(testBrowser);
      try {
        const entry = await verifyComponent(page, previewUrl, id, bindings, props);
        done++;
        options.onProgress?.(done, ids.length, id);
        return entry;
      } finally {
        await page.close();
      }
    });

    options.onProgress?.(ids.length, ids.length);

    const report: InteractionVerifyReport = {};
    for (const [id, entry, localTuned] of entries) {
      report[id] = entry;
      tuned[id] = localTuned;
    }

    const reportPath = getVerifyReportPath(root);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return { report, bindings: tuned };
  } finally {
    if (owned && "close" in testBrowser) {
      await (testBrowser as Awaited<ReturnType<typeof createTestBrowser>>).close();
    }
  }
}

export function formatVerifySummary(report: InteractionVerifyReport): string {
  const lines: string[] = ["Interaction Verification", "========================", ""];
  const ids = Object.keys(report);
  if (ids.length === 0) {
    lines.push("No inferred bindings to verify.", "");
    return lines.join("\n");
  }
  for (const [id, entry] of Object.entries(report)) {
    lines.push(id);
    for (const b of entry.bindings) {
      const mark = b.verified === true ? "✓" : b.verified === false ? "✗" : "•";
      const detail =
        b.verified === null
          ? "no trigger found"
          : `${b.trigger ?? "?"} — ${b.verified ? `confirmed (${b.delta})` : "no state change"}`;
      lines.push(`  ${mark} ${b.handler} → ${b.stateProp}: ${detail}`);
    }
    if (entry.states.length > 0) {
      lines.push(`  states: ${entry.states.map((s) => s.name).join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
