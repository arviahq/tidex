import { Link } from "@tanstack/react-router";
import { CodeBlock } from "../../components/docs/CodeBlock";
import { DocPage } from "../../components/docs/DocPage";

export function AutoDocsPage() {
  return (
    <DocPage
      title="Docs"
      description="Auto-generated documentation for every discovered component — no hand-written doc pages required."
    >
      <section className="doc-section">
        <h2>Docs panel</h2>
        <p>
          Select any component in the manager and open the <strong>Docs</strong> tab. Tide generates
          documentation on the fly from your source — prop schemas, TSDoc descriptions, import paths,
          and a live usage snippet reflecting the current control values.
        </p>
        <p>No separate doc files, no MDX stories, no maintain-a-second-source-of-truth.</p>
      </section>

      <section className="doc-section">
        <h2>What you get per component</h2>
        <ul>
          <li>
            <strong>Header</strong> — display name, export kind (named vs default), source path
          </li>
          <li>
            <strong>Props table</strong> — name, type, required/optional, TSDoc description, default
            value
          </li>
          <li>
            <strong>Import snippet</strong> — uses <code>packageName</code> when configured
          </li>
          <li>
            <strong>Usage example</strong> — JSX with current args from the Props panel
          </li>
        </ul>
      </section>

      <section className="doc-section">
        <h2>Import lines</h2>
        <p>
          Set <code>packageName</code> in <code>tide.config.ts</code> so the Docs panel shows how
          consumers import your library:
        </p>
        <CodeBlock code={`import { Button } from "@myorg/ui";`} />
        <p>
          Without <code>packageName</code>, Tide falls back to a relative path from the component
          file.
        </p>
      </section>

      <section className="doc-section">
        <h2>Prop descriptions</h2>
        <p>
          TSDoc on prop fields flows into the Docs panel automatically. Write descriptions once on
          your types:
        </p>
        <CodeBlock
          code={`export type ButtonProps = {
  /** Visual style variant */
  variant: "primary" | "secondary";
  /** Disables user interaction */
  disabled?: boolean;
};`}
        />
        <p>
          See <Link to="/docs/component-authoring">Component authoring</Link> for the full props
          guide.
        </p>
      </section>

      <section className="doc-section">
        <h2>Live usage snippets</h2>
        <p>
          The example snippet updates as you tweak controls in the Props panel. Tide uses{" "}
          <code>@tide/docs</code> and <code>@tide/react</code> under the hood to generate import
          lines and JSX from the current arg values — the same output you&apos;d copy into an app.
        </p>
        <CodeBlock
          code={`<Button variant="secondary" disabled>
  Save changes
</Button>`}
        />
      </section>

      <section className="doc-section">
        <h2>Union and complex types</h2>
        <p>Union props render as a list of allowed values in the Docs panel. Unresolved types from</p>
        <p>
          <code>node_modules</code> appear as <code>unknown</code> and are omitted from the prop
          table — keep prop types local for the best documentation experience.
        </p>
      </section>

      <section className="doc-section">
        <h2>Design tokens</h2>
        <p>
          Component docs cover your API. For design foundations, point <code>tokens</code> in config
          at a JSON file — Tide surfaces it under <strong>Foundations → Tokens</strong> in the
          manager sidebar.
        </p>
      </section>
    </DocPage>
  );
}
