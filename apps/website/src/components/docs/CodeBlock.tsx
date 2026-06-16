import { useHighlightedCode } from "../../hooks/useHighlightedCode";
import "../../shiki.css";

type CodeBlockProps = {
  code: string;
  filename?: string;
  language?: string;
};

export function CodeBlock({ code, filename, language }: CodeBlockProps) {
  const { html } = useHighlightedCode(code, { filename, language });

  return (
    <div className="doc-code">
      {filename ? (
        <div className="doc-code__chrome">
          <span className="doc-code__dot" />
          <span className="doc-code__dot" />
          <span className="doc-code__dot" />
          <span className="doc-code__filename">{filename}</span>
        </div>
      ) : null}
      {html ? (
        <div className="doc-code__highlight" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="doc-code__highlight doc-code__highlight--loading">
          <code className="doc-code__fallback">{code}</code>
        </pre>
      )}
    </div>
  );
}
