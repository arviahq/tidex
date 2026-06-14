import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import {
  getBaselinesDir,
  getReportsDir,
  type Manifest,
} from "@tide/core";

export interface VisualReportEntry {
  changed: boolean;
  pixelsChanged: number;
  diffPath?: string;
}

export type VisualReport = Record<string, VisualReportEntry>;

export interface VisualTestOptions {
  root: string;
  previewUrl: string;
  manifest: Manifest;
  update?: boolean;
}

export async function runVisualTests(options: VisualTestOptions): Promise<VisualReport> {
  const { chromium } = await import("playwright");
  const baselinesDir = getBaselinesDir(options.root);
  const reportsDir = getReportsDir(options.root);
  fs.mkdirSync(baselinesDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const report: VisualReport = {};

  for (const component of options.manifest.components) {
    const url = `${options.previewUrl}?story=${encodeURIComponent(component.name)}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const screenshot = await page.screenshot({ type: "png" });
    const baselinePath = path.join(baselinesDir, `${component.name}.png`);

    if (options.update || !fs.existsSync(baselinePath)) {
      fs.writeFileSync(baselinePath, screenshot);
      report[component.name] = { changed: false, pixelsChanged: 0 };
      continue;
    }

    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(screenshot);

    if (baseline.width !== current.width || baseline.height !== current.height) {
      const diffPath = path.join(reportsDir, `${component.name}-diff.png`);
      fs.writeFileSync(diffPath, screenshot);
      report[component.name] = {
        changed: true,
        pixelsChanged: -1,
        diffPath: path.relative(options.root, diffPath),
      };
      continue;
    }

    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const pixelsChanged = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      baseline.width,
      baseline.height,
      { threshold: 0.1 },
    );

    const changed = pixelsChanged > 0;
    let diffPath: string | undefined;
    if (changed) {
      diffPath = path.join(reportsDir, `${component.name}-diff.png`);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      diffPath = path.relative(options.root, diffPath);
    }

    report[component.name] = { changed, pixelsChanged, diffPath };
  }

  await browser.close();

  const reportPath = path.join(reportsDir, "visual.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

export function hasVisualDiffs(report: VisualReport): boolean {
  return Object.values(report).some((r) => r.changed);
}
