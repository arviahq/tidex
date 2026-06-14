import { formatDisplayName } from "@tide/core";
import { generateComponentDoc } from "@tide/docs";
import { generateJsxSnippet } from "@tide/react";
import { useState } from "react";
import type { PropSchema } from "../api";
import { CodeBlock } from "./CodeBlock";
import "./docs.css";

interface ComponentEntry {
  name: string;
  path: string;
  exportName: string;
  title: string;
  isDefault?: boolean;
}

interface DocsPanelProps {
  component: ComponentEntry;
  props: Record<string, PropSchema>;
  args: Record<string, unknown>;
}

export function DocsPanel({ component, props, args }: DocsPanelProps) {
  const doc = generateComponentDoc(component, props, args);
  const code = generateJsxSnippet(component.name, args);
  const importLine = formatImportLine(component);
  const propEntries = doc.props;

  return (
    <div className="bb-docs">
      <header className="bb-docs__header">
        <div className="bb-docs__title-row">
          <h2 className="bb-docs__name">{formatDisplayName(doc.name)}</h2>
          <div className="bb-docs__badges">
            <span className="bb-docs__badge">{propEntries.length} props</span>
            <span className="bb-docs__badge bb-docs__badge--muted">
              {component.isDefault ? "default export" : "named export"}
            </span>
          </div>
        </div>
        <p className="bb-docs__story-path">{doc.title}</p>
        <CopyLine label="Source" value={component.path} mono />
      </header>

      <section className="bb-docs__section">
        <div className="bb-docs__section-head">
          <h3 className="bb-docs__section-title">Props</h3>
          {propEntries.length > 0 && (
            <span className="bb-docs__section-count">{propEntries.length}</span>
          )}
        </div>

        {propEntries.length === 0 ? (
          <p className="bb-docs__empty">No props documented for this component.</p>
        ) : (
          <div className="bb-docs__props">
            {propEntries.map((prop) => (
              <PropRow
                key={prop.name}
                name={prop.name}
                schema={props[prop.name]}
                required={prop.required}
                defaultValue={args[prop.name]}
              />
            ))}
          </div>
        )}
      </section>

      <section className="bb-docs__section">
        <div className="bb-docs__section-head">
          <h3 className="bb-docs__section-title">Usage</h3>
        </div>

        <div className="bb-docs__usage">
          <div className="bb-docs__code-block">
            <CodeBlockHeader label="Import" value={importLine} />
            <CodeBlock code={importLine} language="tsx" />
          </div>

          <div className="bb-docs__code-block">
            <CodeBlockHeader label="Example" value={code} />
            <CodeBlock code={code} language="tsx" />
          </div>
        </div>
      </section>
    </div>
  );
}

function PropRow({
  name,
  schema,
  required,
  defaultValue,
}: {
  name: string;
  schema?: PropSchema;
  required: boolean;
  defaultValue: unknown;
}) {
  return (
    <article className="bb-docs__prop">
      <div className="bb-docs__prop-main">
        <div className="bb-docs__prop-head">
          <span className="bb-docs__prop-name">{name}</span>
          <span className="bb-docs__prop-required" data-required={required ? "true" : undefined}>
            {required ? "required" : "optional"}
          </span>
        </div>
        <PropType schema={schema} fallback="unknown" />
      </div>
      <div className="bb-docs__prop-default">
        <span className="bb-docs__prop-default-label">Default</span>
        <DefaultValue value={defaultValue} />
      </div>
    </article>
  );
}

function PropType({ schema, fallback }: { schema?: PropSchema; fallback: string }) {
  if (!schema) {
    return <span className="bb-docs__type bb-docs__type--unknown">{fallback}</span>;
  }

  if (schema.type === "union") {
    return (
      <div className="bb-docs__union">
        {schema.values.map((value) => (
          <span key={value} className="bb-docs__union-value">
            {value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <span className="bb-docs__type" data-kind={schema.type}>
      {schema.type}
    </span>
  );
}

function DefaultValue({ value }: { value: unknown }) {
  if (value === undefined) {
    return <span className="bb-docs__default-value bb-docs__default-value--empty">—</span>;
  }

  if (typeof value === "string") {
    return <span className="bb-docs__default-value">&quot;{value}&quot;</span>;
  }

  if (typeof value === "boolean") {
    return <span className="bb-docs__default-value">{value ? "true" : "false"}</span>;
  }

  if (typeof value === "number") {
    return <span className="bb-docs__default-value">{String(value)}</span>;
  }

  if (value === null) {
    return <span className="bb-docs__default-value">null</span>;
  }

  return (
    <span className="bb-docs__default-value bb-docs__default-value--object">
      {JSON.stringify(value)}
    </span>
  );
}

function CodeBlockHeader({ label, value }: { label: string; value: string }) {
  return (
    <div className="bb-docs__code-head">
      <span className="bb-docs__code-label">{label}</span>
      <CopyButton value={value} />
    </div>
  );
}

function CopyLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bb-docs__copy-line">
      <span className="bb-docs__copy-line-label">{label}</span>
      <code
        className={
          mono
            ? "bb-docs__copy-line-value bb-docs__copy-line-value--mono"
            : "bb-docs__copy-line-value"
        }
      >
        {value}
      </code>
      <CopyButton value={value} compact />
    </div>
  );
}

function CopyButton({ value, compact }: { value: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <button
      type="button"
      className={compact ? "bb-docs__copy bb-docs__copy--compact" : "bb-docs__copy"}
      onClick={() => void copy()}
      title="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function formatImportLine(component: ComponentEntry): string {
  const path = component.path.replace(/^src\//, "./").replace(/\.tsx?$/, "");

  if (component.isDefault) {
    return `import ${component.exportName} from "${path}";`;
  }

  return `import { ${component.exportName} } from "${path}";`;
}
