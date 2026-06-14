import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { isValidComponentId } from "@tide/core";
import { runSingleVisualTest } from "./engine.js";
import { getReportsDir } from "@tide/core";

export interface TideVisualPluginOptions {
  root: string;
  previewUrl: string;
  threshold?: number;
}

function readJsonBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function isValidComponentName(name: string): boolean {
  return isValidComponentId(name);
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function tideVisualPlugin(options: TideVisualPluginOptions): Plugin {
  return {
    name: "tide-visual",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        if (!url.startsWith("/__tide/visual")) {
          next();
          return;
        }

        if (url === "/__tide/visual/report.json" && req.method === "GET") {
          const reportPath = path.join(getReportsDir(options.root), "visual.json");
          if (!fs.existsSync(reportPath)) {
            sendJson(res, 200, {});
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(fs.readFileSync(reportPath, "utf-8"));
          return;
        }

        const handleVisual = async (update: boolean) => {
          try {
            const body = await readJsonBody(req);
            const parsed = JSON.parse(body) as {
              component?: string;
              args?: Record<string, unknown>;
              theme?: "light" | "dark";
            };
            const component = parsed.component ?? "";
            if (!isValidComponentName(component)) {
              sendJson(res, 400, { ok: false, error: "Invalid component name" });
              return;
            }
            const result = await runSingleVisualTest({
              root: options.root,
              previewUrl: options.previewUrl,
              component,
              args: parsed.args,
              theme: parsed.theme,
              update,
              threshold: options.threshold,
            });
            const { hasBaseline, ok, ...entry } = result;
            sendJson(res, 200, { ok, entry, hasBaseline });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const hint =
              message.includes("playwright") || message.includes("browser")
                ? "Install Playwright browsers: npx playwright install chromium"
                : message;
            sendJson(res, 503, { ok: false, error: hint });
          }
        };

        if (url === "/__tide/visual/run" && req.method === "POST") {
          void handleVisual(false);
          return;
        }

        if (url === "/__tide/visual/update" && req.method === "POST") {
          void handleVisual(true);
          return;
        }

        next();
      });
    },
  };
}
