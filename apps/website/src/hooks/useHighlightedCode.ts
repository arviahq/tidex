import { useEffect, useState } from "react";
import { highlightCode, inferLanguage } from "../lib/shiki";

export function useHighlightedCode(
  code: string,
  options: { filename?: string; language?: string } = {},
) {
  const lang = inferLanguage(code, options.filename, options.language);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    highlightCode(code, lang).then((result) => {
      if (!cancelled) setHtml(result);
    });

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  return { html, lang };
}
