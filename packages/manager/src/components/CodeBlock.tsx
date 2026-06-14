import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import "./code.css";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("jsx", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", bash);

export type CodeLanguage = "tsx" | "jsx" | "json" | "bash" | "shell";

interface CodeBlockProps {
  code: string;
  language?: CodeLanguage;
  className?: string;
}

export function CodeBlock({ code, language = "tsx", className }: CodeBlockProps) {
  const html = useMemo(() => {
    try {
      return hljs.highlight(code.trimEnd(), { language }).value;
    } catch {
      return hljs.highlightAuto(code.trimEnd()).value;
    }
  }, [code, language]);

  return (
    <pre className={className ? `bb-code ${className}` : "bb-code"}>
      <code className={`hljs language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
