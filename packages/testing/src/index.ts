import fs from "node:fs";
import path from "node:path";
import { getReportsDir, getComponentId, type ComponentEntry, type Manifest } from "@tidex/core";
import { createTestBrowser, createTestPage, type TestBrowser } from "./browser.js";
import { gotoStory, ROOT_SELECTOR } from "./navigation.js";
import { defaultWorkers, mapPool } from "./pool.js";

export {
  runInteractionTests,
  hasInteractionFailures,
  formatInteractionSummary,
  type InteractionReport,
  type InteractionReportEntry,
  type InteractionTestOptions,
} from "./interactions.js";

export {
  verifyInteractions,
  formatVerifySummary,
  stateArgsFor,
  type VerifyInteractionsOptions,
  type VerifyInteractionsResult,
} from "./verify-interactions.js";

export { createTestBrowser, createTestPage, type TestBrowser, type TestBrowserHandle } from "./browser.js";
export { defaultWorkers } from "./pool.js";

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
  /** Shared browser session (caller owns lifecycle when provided). */
  browser?: TestBrowser;
  /** Parallel component workers (default: min(4, CPU count)). */
  workers?: number;
  /** Reports per-component progress as `(done, total, label)`. */
  onProgress?: (done: number, total: number, label?: string) => void;
}

/** Page-level rules that don't apply when testing an isolated component canvas. */
const PREVIEW_ONLY_A11Y_RULES = [
  "landmark-one-main",
  "page-has-heading-one",
  "region",
] as const;

async function runA11yForComponent(
  page: Awaited<ReturnType<typeof createTestPage>>,
  previewUrl: string,
  component: ComponentEntry,
): Promise<[string, A11yReportEntry]> {
  const AxeBuilder = (await import("@axe-core/playwright")).default;
  const componentId = getComponentId(component);
  const url = `${previewUrl}?story=${encodeURIComponent(componentId)}`;
  await gotoStory(page, url);

  const results = await new AxeBuilder({ page })
    .include(ROOT_SELECTOR)
    .disableRules([...PREVIEW_ONLY_A11Y_RULES])
    .analyze();
  return [
    componentId,
    {
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })),
      passes: results.passes.length,
    },
  ];
}

export async function runA11yTests(options: A11yTestOptions): Promise<A11yReport> {
  const reportsDir = getReportsDir(options.root);
  fs.mkdirSync(reportsDir, { recursive: true });

  const owned = !options.browser;
  const testBrowser = options.browser ?? (await createTestBrowser());
  const workers = defaultWorkers(options.workers);
  const components = options.manifest.components;
  let done = 0;

  try {
    const entries = await mapPool(components, workers, async (component) => {
      const page = await createTestPage(testBrowser);
      try {
        const entry = await runA11yForComponent(page, options.previewUrl, component);
        done++;
        options.onProgress?.(done, components.length, component.name);
        return entry;
      } finally {
        await page.close();
      }
    });

    options.onProgress?.(components.length, components.length);

    const report: A11yReport = {};
    for (const [id, entry] of entries) report[id] = entry;

    const reportPath = path.join(reportsDir, "a11y.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return report;
  } finally {
    if (owned && "close" in testBrowser) {
      await (testBrowser as Awaited<ReturnType<typeof createTestBrowser>>).close();
    }
  }
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
