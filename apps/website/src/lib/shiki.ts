import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import bash from "@shikijs/langs/bash";
import json from "@shikijs/langs/json";
import tsx from "@shikijs/langs/tsx";
import typescript from "@shikijs/langs/typescript";
import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";
import type { HighlighterCore } from "shiki";

const LANGS = ["typescript", "tsx", "bash", "json"] as const;
export type CodeLanguage = (typeof LANGS)[number] | "text";

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [typescript, tsx, bash, json],
      langAlias: { ts: "typescript" },
      engine: createOnigurumaEngine(() => import("shiki/wasm")),
    });
  }
  return highlighterPromise;
}

export function inferLanguage(code: string, filename?: string, explicit?: string): CodeLanguage {
  if (explicit === "text") return "text";
  if (explicit && LANGS.includes(explicit as (typeof LANGS)[number])) {
    return explicit as CodeLanguage;
  }

  if (filename === "terminal") return "bash";
  if (filename?.endsWith(".tsx")) return "tsx";
  if (filename?.endsWith(".ts")) return "typescript";

  const trimmed = code.trim();
  if (/^(pnpm|npm|cd |tide )/.test(trimmed)) return "bash";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.includes("import ") || trimmed.includes("export ")) {
    return trimmed.includes("<") ? "tsx" : "typescript";
  }

  return "text";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function highlightCode(code: string, lang: CodeLanguage): Promise<string> {
  const trimmed = code.trimEnd();

  if (lang === "text") {
    return `<pre class="shiki shiki-plain" tabindex="0"><code>${escapeHtml(trimmed)}</code></pre>`;
  }

  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(trimmed, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  });
}
