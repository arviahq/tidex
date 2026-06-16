import { Link } from "@tanstack/react-router";
import { CodeBlock } from "../../components/docs/CodeBlock";
import { DocPage } from "../../components/docs/DocPage";

export function ConfigReferencePage() {
  return (
    <DocPage
      title="Configuration reference"
      description="All options live in tidex.config.ts at the package root where you run Tidex commands."
    >
      <section className="doc-section">
        <h2>Full example</h2>
        <CodeBlock
          filename="tidex.config.ts"
          code={`import { defineConfig } from "@tidex/core";

export default defineConfig({
  root: process.cwd(),
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**", "**/internal/**"],
    componentsDir: "src/components",
  },
  packageName: "@myorg/ui",
  defaults: {
    "forms/Checkbox": { label: "Accept terms", checked: true },
  },
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TidexWrapper.tsx",
    vite: {
      plugins: [],
    },
  },
  managerPort: 6006,
  previewPort: 6007,
  visual: { threshold: 0.1 },
  plugins: [],
});`}
        />
      </section>

      <section className="doc-section">
        <h2>Options</h2>

        <h3>
          <code>scan.include</code>
        </h3>
        <p>
          Glob patterns for <code>.tsx</code> files to scan. Default:{" "}
          <code>["src/**/*.tsx"]</code>. Run Tidex from the package that owns these files.
        </p>

        <h3>
          <code>scan.exclude</code>
        </h3>
        <p>
          Additional globs excluded from discovery. Tidex always excludes <code>*.stories.*</code>,{" "}
          <code>*.test.*</code>, <code>*.spec.*</code>, and <code>*.d.ts</code>. Default in{" "}
          <code>tidex init</code>: <code>["**/preview/**"]</code>.
        </p>

        <h3>
          <code>scan.componentsDir</code>
        </h3>
        <p>
          Path segment used for sidebar grouping and stable component ids. Default:{" "}
          <code>"src/components"</code>.
        </p>
        <p>
          Example: with <code>componentsDir: "src/ui"</code>, a file at{" "}
          <code>src/ui/forms/Checkbox.tsx</code> gets id <code>forms/Checkbox</code> and appears
          under <strong>Forms</strong> in the sidebar.
        </p>

        <h3>
          <code>packageName</code>
        </h3>
        <p>npm package name shown in the Docs panel import example:</p>
        <CodeBlock code={`import { Button } from "@myorg/ui";`} />

        <h3>
          <code>defaults</code>
        </h3>
        <p>Per-component default arg overrides, keyed by <strong>component id</strong>:</p>
        <CodeBlock
          code={`defaults: {
  Button: { variant: "secondary", children: "Click me" },
  "overlays/Modal": { title: "Confirm action" },
},`}
        />

        <h3>
          <code>tokens</code>
        </h3>
        <p>
          Path to a JSON token file, copied to <code>.tidex/tokens.json</code> on generate. Shown
          under <strong>Foundations → Tokens</strong>.
        </p>

        <h3>
          <code>preview.wrapper</code>
        </h3>
        <p>
          Module path whose <strong>default export</strong> is a React component accepting{" "}
          <code>{"{ children }"}</code>. Every story renders inside it.
        </p>

        <h3>
          <code>preview.vite</code>
        </h3>
        <p>
          Extra Vite config merged into preview, visual, and test servers. Use for Tailwind,
          vanilla-extract, SVGR, etc.
        </p>

        <h3>
          <code>visual.threshold</code>
        </h3>
        <p>
          Pixel diff threshold for visual regression (0–1). Default: <code>0.1</code>.
        </p>

        <h3>
          <code>managerPort</code> / <code>previewPort</code>
        </h3>
        <p>
          Dev server ports. Defaults: <code>6006</code> / <code>6007</code>.
        </p>
      </section>

      <section className="doc-section">
        <h2>Generated artifacts</h2>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>.tidex/manifest.json</code>
                </td>
                <td>Discovered components (with stable id)</td>
              </tr>
              <tr>
                <td>
                  <code>.tidex/props.json</code>
                </td>
                <td>Extracted prop schemas, keyed by id</td>
              </tr>
              <tr>
                <td>
                  <code>.tidex/stories.generated.ts</code>
                </td>
                <td>Lazy story modules</td>
              </tr>
              <tr>
                <td>
                  <code>.tidex/config.json</code>
                </td>
                <td>Snapshot of packageName, defaults, componentsDir</td>
              </tr>
              <tr>
                <td>
                  <code>.tidex/scan-report.json</code>
                </td>
                <td>Warnings and diagnostics</td>
              </tr>
              <tr>
                <td>
                  <code>.tidex/tokens.json</code>
                </td>
                <td>Copy of your tokens file</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          See the <Link to="/docs/tidex-folder">.tidex folder</Link> guide for the full directory layout,
          manager-authored files, reports, and git rules.
        </p>
      </section>

      <section className="doc-section">
        <h2>CLI</h2>
        <CodeBlock
          code={`tidex init                  # scaffold config + folders
tidex generate              # scan and write artifacts
tidex generate --verbose    # print diagnostics
tidex doctor                # validate setup
tidex dev                   # start manager + preview`}
        />
      </section>
    </DocPage>
  );
}
