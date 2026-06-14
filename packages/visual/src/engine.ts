import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { getBaselinesDir, getReportsDir, type Manifest } from "@tide/core";
import type { Browser, BrowserContext, Page } from "playwright";

export interface VisualReportEntry {
  changed: boolean;
  pixelsChanged: number;
  diffPath?: string;
  currentPath?: string;
  sizeMismatch?: boolean;
}

export type VisualReport = Record<string, VisualReportEntry>;

export interface VisualTestOptions {
  root: string;
  previewUrl: string;
  manifest: Manifest;
  update?: boolean;
  threshold?: number;
}

export interface VisualComponentTestOptions {
  page: Page;
  root: string;
  component: string;
  previewUrl: string;
  args?: Record<string, unknown>;
  theme?: "light" | "dark";
  update?: boolean;
  threshold?: number;
}

export const VISUAL_VIEWPORT = { width: 800, height: 600 };
export const VISUAL_DEVICE_SCALE_FACTOR = 2;
export const VISUAL_SELECTOR = "[data-tide-visual]";
const DEFAULT_THRESHOLD = 0.1;

export function buildVisualPreviewUrl(
  previewUrl: string,
  component: string,
  args?: Record<string, unknown>,
  theme?: "light" | "dark",
): string {
  const params = new URLSearchParams();
  params.set("story", component);
  params.set("visual", "1");
  if (args && Object.keys(args).length > 0) {
    params.set("args", JSON.stringify(args));
  }
  if (theme) {
    params.set("theme", theme);
  }
  return `${previewUrl}?${params.toString()}`;
}

async function launchVisualPage(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VISUAL_VIEWPORT,
    deviceScaleFactor: VISUAL_DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  return { browser, context, page };
}

function baselinePathFor(root: string, component: string): string {
  return path.join(getBaselinesDir(root), `${component}.png`);
}

function currentPathFor(root: string, component: string): string {
  return path.join(getReportsDir(root), `${component}-current.png`);
}

function diffPathFor(root: string, component: string): string {
  return path.join(getReportsDir(root), `${component}-diff.png`);
}

function writeSizeMismatchDiff(baseline: PNG, current: PNG, outPath: string): void {
  const gap = 8;
  const width = baseline.width + gap + current.width;
  const height = Math.max(baseline.height, current.height);
  const combined = new PNG({ width, height });

  for (let i = 0; i < combined.data.length; i += 4) {
    combined.data[i] = 30;
    combined.data[i + 1] = 41;
    combined.data[i + 2] = 59;
    combined.data[i + 3] = 255;
  }

  PNG.bitblt(baseline, combined, 0, 0, baseline.width, baseline.height, 0, 0);
  PNG.bitblt(current, combined, 0, 0, current.width, current.height, baseline.width + gap, 0);
  fs.writeFileSync(outPath, PNG.sync.write(combined));
}

async function captureComponentScreenshot(page: Page, url: string): Promise<Buffer> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const locator = page.locator(VISUAL_SELECTOR);
  await locator.waitFor({ state: "visible", timeout: 10_000 });
  return locator.screenshot({ type: "png", scale: "device" });
}

export async function runVisualTestForComponent(
  options: VisualComponentTestOptions,
): Promise<VisualReportEntry & { hasBaseline: boolean }> {
  const {
    page,
    root,
    component,
    previewUrl,
    args,
    theme,
    update = false,
    threshold = DEFAULT_THRESHOLD,
  } = options;

  const baselinesDir = getBaselinesDir(root);
  const reportsDir = getReportsDir(root);
  fs.mkdirSync(baselinesDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  const url = buildVisualPreviewUrl(previewUrl, component, args, theme);
  const screenshot = await captureComponentScreenshot(page, url);

  const baselineFile = baselinePathFor(root, component);
  const currentFile = currentPathFor(root, component);
  fs.writeFileSync(currentFile, screenshot);

  const currentRel = path.relative(root, currentFile);

  if (update || !fs.existsSync(baselineFile)) {
    fs.writeFileSync(baselineFile, screenshot);
    return {
      changed: false,
      pixelsChanged: 0,
      currentPath: currentRel,
      hasBaseline: true,
    };
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselineFile));
  const current = PNG.sync.read(screenshot);

  if (baseline.width !== current.width || baseline.height !== current.height) {
    const diffFile = diffPathFor(root, component);
    writeSizeMismatchDiff(baseline, current, diffFile);
    return {
      changed: true,
      pixelsChanged: -1,
      diffPath: path.relative(root, diffFile),
      currentPath: currentRel,
      sizeMismatch: true,
      hasBaseline: true,
    };
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const pixelsChanged = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold },
  );

  const changed = pixelsChanged > 0;
  let diffRel: string | undefined;
  if (changed) {
    const diffFile = diffPathFor(root, component);
    fs.writeFileSync(diffFile, PNG.sync.write(diff));
    diffRel = path.relative(root, diffFile);
  }

  return {
    changed,
    pixelsChanged,
    diffPath: diffRel,
    currentPath: currentRel,
    hasBaseline: true,
  };
}

export function writeVisualReport(root: string, report: VisualReport): void {
  const reportsDir = getReportsDir(root);
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, "visual.json"), JSON.stringify(report, null, 2));
}

export function readVisualReport(root: string): VisualReport {
  const reportPath = path.join(getReportsDir(root), "visual.json");
  if (!fs.existsSync(reportPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf-8")) as VisualReport;
  } catch {
    return {};
  }
}

export function mergeVisualReportEntry(
  root: string,
  component: string,
  entry: VisualReportEntry,
): VisualReport {
  const report = readVisualReport(root);
  report[component] = entry;
  writeVisualReport(root, report);
  return report;
}

export async function runVisualTests(options: VisualTestOptions): Promise<VisualReport> {
  const { browser, context, page } = await launchVisualPage();
  const report: VisualReport = {};

  try {
    for (const component of options.manifest.components) {
      const entry = await runVisualTestForComponent({
        page,
        root: options.root,
        component: component.name,
        previewUrl: options.previewUrl,
        update: options.update,
        threshold: options.threshold,
      });
      const { hasBaseline: _hasBaseline, ...reportEntry } = entry;
      report[component.name] = reportEntry;
    }
  } finally {
    await context.close();
    await browser.close();
  }

  writeVisualReport(options.root, report);
  return report;
}

export interface SingleVisualTestOptions {
  root: string;
  previewUrl: string;
  component: string;
  args?: Record<string, unknown>;
  theme?: "light" | "dark";
  update?: boolean;
  threshold?: number;
}

export async function runSingleVisualTest(
  options: SingleVisualTestOptions,
): Promise<VisualReportEntry & { hasBaseline: boolean; ok: boolean }> {
  const { browser, context, page } = await launchVisualPage();

  try {
    const entry = await runVisualTestForComponent({
      page,
      root: options.root,
      component: options.component,
      previewUrl: options.previewUrl,
      args: options.args,
      theme: options.theme,
      update: options.update,
      threshold: options.threshold,
    });
    const { hasBaseline: _hasBaseline, ...reportEntry } = entry;
    mergeVisualReportEntry(options.root, options.component, reportEntry);
    return { ...entry, ok: !entry.changed };
  } finally {
    await context.close();
    await browser.close();
  }
}

export function hasVisualDiffs(report: VisualReport): boolean {
  return Object.values(report).some((r) => r.changed);
}

export function formatVisualSummary(report: VisualReport): string {
  const lines: string[] = ["Visual Report", "================", ""];
  const names = Object.keys(report);
  if (names.length === 0) {
    lines.push("No components tested.", "");
    return lines.join("\n");
  }
  for (const [name, entry] of Object.entries(report)) {
    if (entry.changed) {
      const detail = entry.sizeMismatch
        ? "size mismatch"
        : entry.pixelsChanged >= 0
          ? `${entry.pixelsChanged} pixels changed`
          : "changed";
      lines.push(`  ✗ ${name}: ${detail}`);
    } else {
      lines.push(`  ✓ ${name}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function hasBaseline(root: string, component: string): boolean {
  return fs.existsSync(baselinePathFor(root, component));
}
