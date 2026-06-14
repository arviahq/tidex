import fs from "node:fs";
import path from "node:path";
import { getReportsDir, getComponentId, type Manifest } from "@tide/core";

export {
  runInteractionTests,
  hasInteractionFailures,
  formatInteractionSummary,
  type InteractionReport,
  type InteractionReportEntry,
  type InteractionTestOptions,
} from "./interactions.js";

export interface A11yViolation {
  id: string;
  impact: string | null | undefined;
  description: string;
  nodes: number;
}

export interface A11yReportEntry {
  violations: A11yViolation[];
  passes: number;
}

export type A11yReport = Record<string, A11yReportEntry>;

export interface A11yTestOptions {
  root: string;
  previewUrl: string;
  manifest: Manifest;
}

export async function runA11yTests(options: A11yTestOptions): Promise<A11yReport> {
  const { chromium } = await import("playwright");
  const AxeBuilder = (await import("@axe-core/playwright")).default;

  const reportsDir = getReportsDir(options.root);
  fs.mkdirSync(reportsDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const report: A11yReport = {};

  for (const component of options.manifest.components) {
    const componentId = getComponentId(component);
    const url = `${options.previewUrl}?story=${encodeURIComponent(componentId)}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page }).analyze();

    report[componentId] = {
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })),
      passes: results.passes.length,
    };
  }

  await browser.close();

  const reportPath = path.join(reportsDir, "a11y.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

export function hasA11yViolations(report: A11yReport): boolean {
  return Object.values(report).some((r) => r.violations.length > 0);
}

export function formatA11ySummary(report: A11yReport): string {
  const lines: string[] = ["Accessibility Report", "==================", ""];
  for (const [name, entry] of Object.entries(report)) {
    lines.push(`${name}`);
    if (entry.violations.length === 0) {
      lines.push("  ✓ No violations");
    } else {
      for (const v of entry.violations) {
        lines.push(`  ✗ ${v.id} (${v.impact}): ${v.description} [${v.nodes} nodes]`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}
