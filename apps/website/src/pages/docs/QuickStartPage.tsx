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
        <p>Add Tide to the package that owns your components:</p>
        <CodeBlock code="pnpm add -D tide" />
      </section>

      <section className="doc-section">
        <h2>Initialize</h2>
        <p>
          Scaffold <code>tide.config.ts</code>, preview wrapper folders, and gitignore rules:
        </p>
        <CodeBlock code="pnpm exec tide init" />
      </section>

      <section className="doc-section">
        <h2>Generate &amp; dev</h2>
        <p>Scan components, write artifacts, and start the manager + preview servers:</p>
        <CodeBlock
          filename="terminal"
          code={`pnpm exec tide generate
pnpm exec tide dev`}
        />
        <p>
          Manager runs at <code>http://localhost:6006</code>, preview at{" "}
          <code>http://localhost:6007</code>.
        </p>
      </section>

      <section className="doc-section">
        <h2>Try the example app</h2>
        <p>From the Tide monorepo, the React example is ready to go:</p>
        <CodeBlock
          code={`cd examples/react-app
pnpm exec tide generate
pnpm exec tide dev`}
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
                  <code>tide init</code>
                </td>
                <td>Initialize config, scaffold folders, and gitignore</td>
              </tr>
              <tr>
                <td>
                  <code>tide generate</code>
                </td>
                <td>Scan components and generate artifacts</td>
              </tr>
              <tr>
                <td>
                  <code>tide generate --verbose</code>
                </td>
                <td>Generate with scan diagnostics</td>
              </tr>
              <tr>
                <td>
                  <code>tide doctor</code>
                </td>
                <td>Validate setup and scan health</td>
              </tr>
              <tr>
                <td>
                  <code>tide dev</code>
                </td>
                <td>Start manager (6006) + preview (6007)</td>
              </tr>
              <tr>
                <td>
                  <code>tide test</code>
                </td>
                <td>Run accessibility and interaction tests</td>
              </tr>
              <tr>
                <td>
                  <code>tide visual</code>
                </td>
                <td>Run visual regression tests</td>
              </tr>
              <tr>
                <td>
                  <code>tide visual --update</code>
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
          <code>tide test</code> and <code>tide visual</code> require Playwright. Install browsers once
          per project:
        </p>
        <CodeBlock code="pnpm exec playwright install chromium" />
      </section>

      <section className="doc-section">
        <h2>Next steps</h2>
        <ul>
          <li>
            <Link to="/docs/config-reference">Configuration reference</Link> — every{" "}
            <code>tide.config.ts</code> option
          </li>
          <li>
            <Link to="/docs/component-authoring">Component authoring</Link> — exports, props, and
            controls
          </li>
          <li>
            <Link to="/docs/tide-folder">.tide folder</Link> — generated artifacts, baselines,
            tests, and git rules
          </li>
          <li>
            <Link to="/docs/monorepo">Monorepo guide</Link> — running Tide in a workspace package
          </li>
        </ul>
      </section>
    </DocPage>
  );
}
