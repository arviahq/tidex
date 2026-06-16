import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defaultConfig, getManifestPath, type TidexConfig } from "@tidex/core";

export async function loadConfig(cwd: string): Promise<TidexConfig> {
  const configFiles = ["tidex.config.ts", "tidex.config.js", "tidex.config.mjs"];

  for (const file of configFiles) {
    const configPath = path.join(cwd, file);
    if (!fs.existsSync(configPath)) continue;
    const mod = await import(pathToFileURL(configPath).href);
    const config = mod.default ?? mod.config;
    return { ...defaultConfig(cwd), ...config, root: config.root ?? cwd };
  }

  return defaultConfig(cwd);
}

export function readManifest(root: string) {
  const manifestPath = getManifestPath(root);
  if (!fs.existsSync(manifestPath)) {
    throw new Error("No manifest found. Run `tidex generate` first.");
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
}

export type { TidexConfig };
