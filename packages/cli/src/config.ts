import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  defaultConfig,
  getManifestPath,
  type TideConfig,
} from "@tide/core";

export async function loadConfig(cwd: string): Promise<TideConfig> {
  const configFiles = [
    "tide.config.ts",
    "tide.config.js",
    "tide.config.mjs",
  ];

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
    throw new Error("No manifest found. Run `tide generate` first.");
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
}

export type { TideConfig };
