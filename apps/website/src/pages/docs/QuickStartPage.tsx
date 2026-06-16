import { Link } from "@tanstack/react-router";
import { CodeBlock } from "../../components/docs/CodeBlock";
import { DocPage } from "../../components/docs/DocPage";

export function QuickStartPage() {
  return (
    <DocPage
      title="Quick start"
      description="Get from zero to a running component explorer in three commands."
    >
      <section className="doc-section">
        <h2>Install</h2>
        <p>Add Tidex to the package that owns your components:</p>
        <CodeBlock code="pnpm add -D tidex" />
      </section>

      <section className="doc-section">
        <h2>Initialize</h2>
        <p>
          Scaffold <code>tidex.config.ts</code>, preview wrapper folders, and gitignore rules:
        </p>
        <CodeBlock code="pnpm exec tidex init" />
      </section>

      <section className="doc-section">
        <h2>Generate &amp; dev</h2>
        <p>Scan components, write artifacts, and start the manager + preview servers:</p>
        <CodeBlock
          filename="terminal"
          code={`pnpm exec tidex generate
pnpm exec tidex dev`}
        />
        <p>
          Manager runs at <code>http://localhost:6006</code>, preview at{" "}
          <code>http://localhost:6007</code>.
        </p>
      </section>

      <section className="doc-section">
        <h2>Try the example app</h2>
        <p>From the Tidex monorepo, the React example is ready to go:</p>
        <CodeBlock
          code={`cd examples/react-app
pnpm exec tidex generate
pnpm exec tidex dev`}
        />
      </section>

      <section className="doc-section">
        <h2>CLI commands</h2>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Command</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>tidex init</code>
                </td>
                <td>Initialize config, scaffold folders, and gitignore</td>
              </tr>
              <tr>
                <td>
                  <code>tidex generate</code>
                </td>
                <td>Scan components and generate artifacts</td>
              </tr>
              <tr>
                <td>
                  <code>tidex generate --verbose</code>
                </td>
                <td>Generate with scan diagnostics</td>
              </tr>
              <tr>
                <td>
                  <code>tidex doctor</code>
                </td>
                <td>Validate setup and scan health</td>
              </tr>
              <tr>
                <td>
                  <code>tidex dev</code>
                </td>
                <td>Start manager (6006) + preview (6007)</td>
              </tr>
              <tr>
                <td>
                  <code>tidex test</code>
                </td>
                <td>Run accessibility and interaction tests</td>
              </tr>
              <tr>
                <td>
                  <code>tidex visual</code>
                </td>
                <td>Run visual regression tests</td>
              </tr>
              <tr>
                <td>
                  <code>tidex visual --update</code>
                </td>
                <td>Refresh visual baselines</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2>Testing setup</h2>
        <p>
          <code>tidex test</code> and <code>tidex visual</code> require Playwright. Install browsers
          once per project:
        </p>
        <CodeBlock code="pnpm exec playwright install chromium" />
      </section>

      <section className="doc-section">
        <h2>Next steps</h2>
        <ul>
          <li>
            <Link to="/docs/config-reference">Configuration reference</Link> — every{" "}
            <code>tidex.config.ts</code> option
          </li>
          <li>
            <Link to="/docs/component-authoring">Component authoring</Link> — exports, props, and
            controls
          </li>
          <li>
            <Link to="/docs/tidex-folder">.tidex folder</Link> — generated artifacts, baselines,
            tests, and git rules
          </li>
          <li>
            <Link to="/docs/monorepo">Monorepo guide</Link> — running Tidex in a workspace package
          </li>
        </ul>
      </section>
    </DocPage>
  );
}
