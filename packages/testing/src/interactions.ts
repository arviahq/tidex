import fs from "node:fs";
import path from "node:path";
import {
  getReportsDir,
  getTestPath,
  getComponentId,
  type ComponentEntry,
  type InteractionTest,
  type Manifest,
  type StepResult,
} from "@tidex/core";
import { createTestBrowser, createTestPage, type TestBrowser } from "./browser.js";
import { gotoStory } from "./navigation.js";
import { defaultWorkers, mapPool } from "./pool.js";
import { runStepsPlaywright } from "./playwrightSteps.js";

export interface InteractionReportEntry {
  ok: boolean;
  steps: StepResult[];
}

export type InteractionReport = Record<string, InteractionReportEntry>;

export interface InteractionTestOptions {
  root: string;
  previewUrl: string;
  manifest: Manifest;
  /** Shared browser session (caller owns lifecycle when provided). */
  browser?: TestBrowser;
  /** Parallel component workers (default: min(4, CPU count)). */
  workers?: number;
  /** Reports per-component progress as `(done, total, label)`. */
  onProgress?: (done: number, total: number, label?: string) => void;
}

interface ComponentWithTest {
  component: ComponentEntry;
  test: InteractionTest;
}

function loadInteractionTest(root: string, componentId: string): InteractionTest | null {
  const testPath = getTestPath(root, componentId);
  if (!fs.existsSync(testPath)) return null;
  try {
    const test = JSON.parse(fs.readFileSync(testPath, "utf-8")) as InteractionTest;
    if (!test.steps || test.steps.length === 0) return null;
    return test;
  } catch {
    return null;
  }
}

function componentsWithTests(root: string, manifest: Manifest): ComponentWithTest[] {
  const out: ComponentWithTest[] = [];
  for (const component of manifest.components) {
    const componentId = getComponentId(component);
    const test = loadInteractionTest(root, componentId);
    if (test) out.push({ component, test });
  }
  return out;
}

async function runInteractionForComponent(
  page: Awaited<ReturnType<typeof createTestPage>>,
  previewUrl: string,
  componentId: string,
  test: InteractionTest,
): Promise<[string, InteractionReportEntry]> {
  const argsParam = test.args ? `&args=${encodeURIComponent(JSON.stringify(test.args))}` : "";
  const url = `${previewUrl}?story=${encodeURIComponent(componentId)}${argsParam}`;
  await gotoStory(page, url);
  const steps = await runStepsPlaywright(page, test.steps);
  const ok = steps.length === test.steps.length && steps.every((s) => s.ok);
  return [componentId, { ok, steps }];
}

/**
 * Run every saved interaction test (`.tidex/tests/<Component>.json`) headlessly
 * against the preview, writing a report to `.tidex/reports/interactions.json`.
 */
export async function runInteractionTests(
  options: InteractionTestOptions,
): Promise<InteractionReport> {
  const reportsDir = getReportsDir(options.root);
  fs.mkdirSync(reportsDir, { recursive: true });

  const owned = !options.browser;
  const testBrowser = options.browser ?? (await createTestBrowser());
  const workers = defaultWorkers(options.workers);
  const withTests = componentsWithTests(options.root, options.manifest);
  let done = 0;

  try {
    const entries = await mapPool(withTests, workers, async ({ component, test }) => {
      const page = await createTestPage(testBrowser);
      const componentId = getComponentId(component);
      try {
        const entry = await runInteractionForComponent(
          page,
          options.previewUrl,
          componentId,
          test,
        );
        done++;
        options.onProgress?.(done, withTests.length, component.name);
        return entry;
      } finally {
        await page.close();
      }
    });

    options.onProgress?.(withTests.length, withTests.length);

    const report: InteractionReport = {};
    for (const [id, entry] of entries) report[id] = entry;

    fs.writeFileSync(path.join(reportsDir, "interactions.json"), JSON.stringify(report, null, 2));
    return report;
  } finally {
    if (owned && "close" in testBrowser) {
      await (testBrowser as Awaited<ReturnType<typeof createTestBrowser>>).close();
    }
  }
}

export function hasInteractionFailures(report: InteractionReport): boolean {
  return Object.values(report).some((r) => !r.ok);
}

export function formatInteractionSummary(report: InteractionReport): string {
  const lines: string[] = ["Interaction Report", "==================", ""];
  const names = Object.keys(report);
  if (names.length === 0) {
    lines.push("No interaction tests found.", "");
    return lines.join("\n");
  }
  for (const [name, entry] of Object.entries(report)) {
    lines.push(name);
    if (entry.ok) {
      lines.push(`  ✓ ${entry.steps.length} step(s) passed`);
    } else {
      for (const s of entry.steps) {
        lines.push(
          s.ok ? `  ✓ step ${s.index + 1}` : `  ✗ step ${s.index + 1}: ${s.message ?? "failed"}`,
        );
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}
