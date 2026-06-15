import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import {
  getBaselinesDir,
  getReportsDir,
  getComponentId,
  getBaselineSnapshotPath,
  getCurrentSnapshotPath,
  type Manifest,
} from "@tide/core";
import type { Browser, BrowserContext, Page } from "playwright";
import { captureComponent } from "./capture.js";
import { computeVisualDiff } from "./diff/summarize.js";
import { VISUAL_SNAPSHOT_VERSION, type VisualSnapshot } from "./snapshot-types.js";
import type { VisualDiffDetail, VisualDiffSummary } from "./diff/types.js";

export interface VisualReportEntry {
  changed: boolean;
  pixelsChanged: number;
  diffPath?: string;
  currentPath?: string;
  sizeMismatch?: boolean;
  /** Relative path to the current-run snapshot JSON. */
  snapshotPath?: string;
  /** Compact multi-layer diff summary (absent for legacy/baseline-less runs). */
  summary?: VisualDiffSummary;
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

function baselinePathFor(root: string, componentId: string): string {
  fs.mkdirSync(path.dirname(path.join(getBaselinesDir(root), componentId)), { recursive: true });
  return path.join(getBaselinesDir(root), `${componentId}.png`);
}

function currentPathFor(root: string, componentId: string): string {
  fs.mkdirSync(path.dirname(path.join(getReportsDir(root), componentId)), { recursive: true });
  return path.join(getReportsDir(root), `${componentId}-current.png`);
}

function diffPathFor(root: string, componentId: string): string {
  fs.mkdirSync(path.dirname(path.join(getReportsDir(root), componentId)), { recursive: true });
  return path.join(getReportsDir(root), `${componentId}-diff.png`);
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

function diffJsonPathFor(root: string, componentId: string): string {
  fs.mkdirSync(path.dirname(path.join(getReportsDir(root), componentId)), { recursive: true });
  return path.join(getReportsDir(root), `${componentId}-diff.json`);
}

export function writeSnapshot(file: string, snapshot: VisualSnapshot): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
}

/** Parse a stored snapshot, skipping anything from an older schema version. */
export function readSnapshot(file: string): VisualSnapshot | null {
  if (!fs.existsSync(file)) return null;
  try {
    const snapshot = JSON.parse(fs.readFileSync(file, "utf-8")) as VisualSnapshot;
    if (snapshot?.meta?.version !== VISUAL_SNAPSHOT_VERSION) return null;
    return snapshot;
  } catch {
    return null;
  }
}

function writeDiffDetail(root: string, componentId: string, detail: VisualDiffDetail): void {
  fs.writeFileSync(diffJsonPathFor(root, componentId), JSON.stringify(detail, null, 2));
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
  const { screenshot, snapshot } = await captureComponent({
    page,
    url,
    componentId: component,
    args,
    theme,
    capturedAt: new Date().toISOString(),
  });

  const baselineFile = baselinePathFor(root, component);
  const currentFile = currentPathFor(root, component);
  fs.writeFileSync(currentFile, screenshot);
  const currentRel = path.relative(root, currentFile);

  // Persist the current snapshot alongside the current PNG.
  snapshot.screenshotPath = currentRel;
  const currentSnapFile = getCurrentSnapshotPath(root, component);
  writeSnapshot(currentSnapFile, snapshot);
  const snapshotRel = path.relative(root, currentSnapFile);

  const baselineSnapFile = getBaselineSnapshotPath(root, component);

  if (update || !fs.existsSync(baselineFile)) {
    fs.writeFileSync(baselineFile, screenshot);
    // Baseline PNG path is conventional, so omit screenshotPath from the committed snapshot.
    writeSnapshot(baselineSnapFile, { ...snapshot, screenshotPath: undefined });
    return {
      changed: false,
      pixelsChanged: 0,
      currentPath: currentRel,
      snapshotPath: snapshotRel,
      hasBaseline: true,
    };
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselineFile));
  const current = PNG.sync.read(screenshot);
  const baselineSnapshot = readSnapshot(baselineSnapFile);

  if (baseline.width !== current.width || baseline.height !== current.height) {
    const diffFile = diffPathFor(root, component);
    writeSizeMismatchDiff(baseline, current, diffFile);
    let summary: VisualDiffSummary | undefined;
    if (baselineSnapshot) {
      const detail = computeVisualDiff(baselineSnapshot, snapshot, {
        pixelsChanged: 0,
        sizeMismatch: true,
      });
      writeDiffDetail(root, component, detail);
      summary = detail.summary;
    }
    return {
      changed: true,
      pixelsChanged: -1,
      diffPath: path.relative(root, diffFile),
      currentPath: currentRel,
      sizeMismatch: true,
      snapshotPath: snapshotRel,
      summary,
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

  let diffRel: string | undefined;
  if (pixelsChanged > 0) {
    const diffFile = diffPathFor(root, component);
    fs.writeFileSync(diffFile, PNG.sync.write(diff));
    diffRel = path.relative(root, diffFile);
  }

  // With both snapshots available, a pixel-only diff (anti-aliasing) is NOT a failure;
  // a semantic change — even a pixel-identical one (e.g. an aria regression) — IS.
  // Without a baseline snapshot (legacy baseline) fall back to the pixel verdict.
  let changed = pixelsChanged > 0;
  let summary: VisualDiffSummary | undefined;
  if (baselineSnapshot) {
    const detail = computeVisualDiff(baselineSnapshot, snapshot, { pixelsChanged });
    writeDiffDetail(root, component, detail);
    summary = detail.summary;
    changed = detail.summary.semanticChanged;
  }

  return {
    changed,
    pixelsChanged,
    diffPath: diffRel,
    currentPath: currentRel,
    snapshotPath: snapshotRel,
    summary,
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
      const componentId = getComponentId(component);
      const entry = await runVisualTestForComponent({
        page,
        root: options.root,
        component: componentId,
        previewUrl: options.previewUrl,
        update: options.update,
        threshold: options.threshold,
      });
      const { hasBaseline: _hasBaseline, ...reportEntry } = entry;
      report[componentId] = reportEntry;
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
    if (entry.summary) {
      const mark =
        entry.summary.classification === "semantic"
          ? "✗"
          : entry.summary.classification === "pixel-noise"
            ? "~"
            : "✓";
      lines.push(`  ${mark} ${name}: ${entry.summary.verdict}`);
    } else if (entry.changed) {
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
