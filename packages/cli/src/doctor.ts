import fs from "node:fs";
import path from "node:path";
import { getManifestPath, getTideDir } from "@tide/core";
import { formatScanDiagnostics, generateArtifacts } from "@tide/scanner";
import { loadConfig } from "./config.js";

export interface DoctorResult {
  ok: boolean;
  messages: string[];
}

export async function runDoctor(cwd?: string): Promise<DoctorResult> {
  const root = cwd ?? process.cwd();
  const messages: string[] = [];
  let ok = true;

  const configPath = ["tide.config.ts", "tide.config.js", "tide.config.mjs"].find((file) =>
    fs.existsSync(path.join(root, file)),
  );

  if (!configPath) {
    ok = false;
    messages.push("✗ No tide.config.ts found — run `tide init`");
    return { ok, messages };
  }
  messages.push(`✓ Found ${configPath}`);

  const config = await loadConfig(root);

  if (config.preview?.wrapper) {
    const wrapperPath = path.isAbsolute(config.preview.wrapper)
      ? config.preview.wrapper
      : path.join(root, config.preview.wrapper);
    if (fs.existsSync(wrapperPath)) {
      messages.push(`✓ Preview wrapper: ${config.preview.wrapper}`);
    } else {
      ok = false;
      messages.push(`✗ Preview wrapper not found: ${config.preview.wrapper}`);
    }
  } else {
    messages.push("⚠ No preview.wrapper — components needing providers may fail to render");
  }

  if (config.tokens) {
    const tokensPath = path.isAbsolute(config.tokens)
      ? config.tokens
      : path.join(root, config.tokens);
    if (fs.existsSync(tokensPath)) {
      messages.push(`✓ Tokens: ${config.tokens}`);
    } else {
      ok = false;
      messages.push(`✗ Tokens file not found: ${config.tokens}`);
    }
  }

  try {
    const result = await generateArtifacts(config);
    messages.push(`✓ Scanned ${result.manifest.components.length} component(s)`);
    if (result.diagnostics.warnings.length > 0) {
      messages.push("");
      messages.push(formatScanDiagnostics(result.diagnostics));
    }
  } catch (err) {
    ok = false;
    messages.push(`✗ Scan failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const manifestPath = getManifestPath(root);
  if (fs.existsSync(manifestPath)) {
    messages.push(`✓ Artifacts in ${getTideDir(root)}/`);
  }

  try {
    await import("playwright");
    messages.push("✓ Playwright available (visual/test commands)");
  } catch {
    messages.push("⚠ Playwright not installed — run `pnpm exec playwright install chromium`");
  }

  return { ok, messages };
}
