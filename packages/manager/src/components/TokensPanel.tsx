import { useMemo, useState, type ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";
import { Tabs, type TabItem } from "./Tabs";
import "./tokens.css";

interface TokensPanelProps {
  tokens: Record<string, unknown> | null;
}

export function TokensPanel({ tokens }: TokensPanelProps) {
  const categories = useMemo(() => (tokens ? Object.keys(tokens).sort() : []), [tokens]);
  const [active, setActive] = useState<string | null>(null);
  const selected = active && categories.includes(active) ? active : (categories[0] ?? null);

  const categoryTabs = useMemo<TabItem[]>(
    () => categories.map((category) => ({ id: category, label: formatCategoryLabel(category) })),
    [categories],
  );

  if (!tokens) {
    return (
      <div className="bb-tokens__empty-state">
        <p>No tokens.json found.</p>
        <p className="bb-tokens__empty-hint">
          Add a <code>tokens</code> path in <code>tide.config.ts</code>.
        </p>
      </div>
    );
  }

  if (categories.length === 0) {
    return <p className="bb-tokens__empty-state">No token categories found.</p>;
  }

  const values = tokens[selected!] as Record<string, unknown>;

  return (
    <div className="bb-tokens">
      <nav className="bb-layout__tokens-tabs">
        <Tabs
          className="bb-tabs--compact"
          items={categoryTabs}
          value={selected!}
          onChange={setActive}
          ariaLabel="Token categories"
        />
      </nav>

      <div className="bb-tokens__body">
        <TokenCategoryView category={selected!} values={values} />
      </div>
    </div>
  );
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function TokenCategoryView({
  category,
  values,
}: {
  category: string;
  values: Record<string, unknown>;
}) {
  switch (category) {
    case "colors":
      return <ColorsView values={values} />;
    case "spacing":
      return <SpacingView values={values} />;
    case "typography":
      return <TypographyView values={values} />;
    case "fontFamily":
    case "font":
      return <FontFamilyView values={values} />;
    case "radius":
      return <RadiusView values={values} />;
    case "border":
      return <BorderView values={values} />;
    case "shadow":
      return <ShadowView values={values} />;
    case "motion":
      return <MotionView values={values} />;
    case "zIndex":
    case "z-index":
      return <ZIndexView values={values} />;
    default:
      return <GenericView category={category} values={values} />;
  }
}

function ColorsView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => (
        <TokenRow
          key={name}
          name={name}
          value={String(value)}
          stage={<div className="bb-tokens__color-demo" style={{ background: String(value) }} />}
        />
      ))}
    </div>
  );
}

function SpacingView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => (
        <TokenRow
          key={name}
          name={name}
          value={String(value)}
          stage={
            <div className="bb-tokens__spacing-demo" style={{ gap: String(value) }}>
              <div className="bb-tokens__spacing-block" />
              <div className="bb-tokens__spacing-block" />
            </div>
          }
        />
      ))}
    </div>
  );
}

function TypographyView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => {
        const style = normalizeTypographyStyle(value);
        const valueText = JSON.stringify(style, null, 2);

        return (
          <TokenRow
            key={name}
            name={name}
            value={valueText}
            stage={
              <div className="bb-tokens__type-demo-wrap">
                <p className="bb-tokens__type-demo" style={style}>
                  Aa
                </p>
                <p className="bb-tokens__type-demo-sentence" style={style}>
                  The quick brown fox
                </p>
              </div>
            }
          />
        );
      })}
    </div>
  );
}

function FontFamilyView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => {
        const fontFamily = String(value);

        return (
          <TokenRow
            key={name}
            name={name}
            value={fontFamily}
            stage={
              <div className="bb-tokens__font-demo-wrap">
                <p className="bb-tokens__font-demo" style={{ fontFamily }}>
                  Aa Bb Cc
                </p>
                <p className="bb-tokens__font-demo-sentence" style={{ fontFamily }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            }
          />
        );
      })}
    </div>
  );
}

function normalizeTypographyStyle(value: unknown): Record<string, string> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, string>;
  }

  return { fontSize: String(value) };
}

function RadiusView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => (
        <TokenRow
          key={name}
          name={name}
          value={String(value)}
          stage={<div className="bb-tokens__radius-demo" style={{ borderRadius: String(value) }} />}
        />
      ))}
    </div>
  );
}

function BorderView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => (
        <TokenRow
          key={name}
          name={name}
          value={String(value)}
          stage={<div className="bb-tokens__border-demo" style={{ borderWidth: String(value) }} />}
        />
      ))}
    </div>
  );
}

function ShadowView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => (
        <ShadowCard key={name} name={name} value={String(value)} />
      ))}
    </div>
  );
}

function MotionView({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => {
        const token = String(value);
        const isDuration = isMotionDuration(token);

        return (
          <TokenRow
            key={name}
            name={name}
            value={token}
            stage={
              isDuration ? (
                <div className="bb-tokens__motion-duration">
                  <div
                    className="bb-tokens__motion-duration-bar"
                    style={{ animationDuration: token }}
                  />
                </div>
              ) : (
                <div className="bb-tokens__motion-ease">
                  <div className="bb-tokens__motion-ease-track" />
                  <div
                    className="bb-tokens__motion-ease-dot"
                    style={{ animationTimingFunction: token }}
                  />
                </div>
              )
            }
          />
        );
      })}
    </div>
  );
}

function ZIndexView({ values }: { values: Record<string, unknown> }) {
  const max = Math.max(...Object.values(values).map((value) => Number(value) || 0), 1);

  return (
    <div className="bb-tokens__token-list">
      {Object.entries(values).map(([name, value]) => {
        const token = String(value);
        const z = Number(value) || 0;
        const lift = z / max;

        return (
          <TokenRow
            key={name}
            name={name}
            value={token}
            stage={
              <div className="bb-tokens__zindex-stack" aria-hidden="true">
                <div className="bb-tokens__zindex-sheet" />
                <div className="bb-tokens__zindex-sheet" />
                <div
                  className="bb-tokens__zindex-sheet bb-tokens__zindex-sheet--active"
                  style={{
                    zIndex: z,
                    transform: `translate(${12 + lift * 8}px, ${-10 - lift * 10}px)`,
                    boxShadow: `0 ${4 + lift * 10}px ${8 + lift * 16}px rgba(15, 23, 42, ${0.08 + lift * 0.1})`,
                  }}
                >
                  {token}
                </div>
              </div>
            }
          />
        );
      })}
    </div>
  );
}

function isMotionDuration(value: string): boolean {
  return /^\d+(\.\d+)?(ms|s)$/i.test(value.trim());
}

function TokenRow({ name, value, stage }: { name: string; value: string; stage: ReactNode }) {
  return (
    <article className="bb-tokens__token-item">
      <div className="bb-tokens__token-stage">{stage}</div>
      <TokenMeta name={name} value={value} />
    </article>
  );
}

function TokenMeta({ name, value }: { name: string; value: string }) {
  return (
    <div className="bb-tokens__token-meta">
      <div className="bb-tokens__token-head">
        <span className="bb-tokens__name">{name}</span>
        <CopyValue value={value} label="Copy" className="bb-tokens__copy-btn" />
      </div>
      <code className="bb-tokens__token-value">{value}</code>
    </div>
  );
}

function ShadowCard({ name, value }: { name: string; value: string }) {
  const isNone = value === "none";
  const isFocus = /focus|ring|color-mix/i.test(name) || /0\s+0\s+0/i.test(value);

  return (
    <article className="bb-tokens__token-item">
      <div className="bb-tokens__token-stage" aria-hidden="true">
        <div
          className="bb-tokens__shadow-demo"
          style={isNone ? undefined : { boxShadow: value }}
          data-focus={isFocus ? "true" : undefined}
        />
      </div>
      <TokenMeta name={name} value={value} />
    </article>
  );
}

function GenericView({ category, values }: { category: string; values: Record<string, unknown> }) {
  const entries = flattenEntries(values);

  if (entries.length === 0) {
    return (
      <div className="bb-tokens__generic">
        <p className="bb-tokens__generic-note">
          No custom preview for <strong>{formatCategoryLabel(category)}</strong>. Showing raw JSON.
        </p>
        <CodeBlock code={JSON.stringify(values, null, 2)} language="json" />
      </div>
    );
  }

  return (
    <div className="bb-tokens__generic">
      <p className="bb-tokens__generic-note">
        No custom preview for <strong>{formatCategoryLabel(category)}</strong>. Values are shown as
        raw tokens.
      </p>
      <div className="bb-tokens__token-list">
        {entries.map(({ path, value }) => (
          <TokenRow
            key={path}
            name={path}
            value={value}
            stage={
              <div className="bb-tokens__generic-demo">
                <span className="bb-tokens__generic-demo-icon" aria-hidden="true">
                  {"{ }"}
                </span>
                <span className="bb-tokens__generic-demo-preview" title={value}>
                  {truncateTokenPreview(value)}
                </span>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

function truncateTokenPreview(value: string, max = 28): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function CopyValue({
  value,
  className,
  label,
}: {
  value: string;
  className?: string;
  label?: string;
}) {
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
      className={className ? `bb-tokens__value ${className}` : "bb-tokens__value"}
      onClick={() => void copy()}
      title={label ? `Copy ${value}` : "Copy value"}
    >
      {copied ? "Copied" : (label ?? value)}
    </button>
  );
}

function flattenEntries(
  values: Record<string, unknown>,
  prefix = "",
): Array<{ path: string; value: string }> {
  const entries: Array<{ path: string; value: string }> = [];

  for (const [key, value] of Object.entries(values)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      entries.push(...flattenEntries(value as Record<string, unknown>, path));
    } else {
      entries.push({ path, value: String(value) });
    }
  }

  return entries;
}
