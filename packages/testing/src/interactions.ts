import fs from "node:fs";
import path from "node:path";
import {
  getReportsDir,
  getTestPath,
  getComponentId,
  type InteractionTest,
  type Manifest,
  type StepResult,
} from "@tide/core";
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
  /** Reports per-component progress as `(done, total, label)`. */
  onProgress?: (done: number, total: number, label?: string) => void;
}

/**
 * Run every saved interaction test (`.tide/tests/<Component>.json`) headlessly
 * against the preview, writing a report to `.tide/reports/interactions.json`.
 */
export async function runInteractionTests(
  options: InteractionTestOptions,
): Promise<InteractionReport> {
  const { chromium } = await import("playwright");

  const reportsDir = getReportsDir(options.root);
  fs.mkdirSync(reportsDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const report: InteractionReport = {};

  const components = options.manifest.components;
  for (let i = 0; i < components.length; i++) {
    const component = components[i]!;
    const componentId = getComponentId(component);
    options.onProgress?.(i, components.length, component.name);
    const testPath = getTestPath(options.root, componentId);
    if (!fs.existsSync(testPath)) continue;

    let test: InteractionTest;
    try {
      test = JSON.parse(fs.readFileSync(testPath, "utf-8")) as InteractionTest;
    } catch {
      continue;
    }
    if (!test.steps || test.steps.length === 0) continue;

    const argsParam = test.args ? `&args=${encodeURIComponent(JSON.stringify(test.args))}` : "";
    const url = `${options.previewUrl}?story=${encodeURIComponent(componentId)}${argsParam}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const steps = await runStepsPlaywright(page, test.steps);
    const ok = steps.length === test.steps.length && steps.every((s) => s.ok);
    report[componentId] = { ok, steps };
  }
  options.onProgress?.(components.length, components.length);

  await browser.close();

  fs.writeFileSync(path.join(reportsDir, "interactions.json"), JSON.stringify(report, null, 2));

  return report;
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
