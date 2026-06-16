import { Link } from "@tanstack/react-router";
import { CodeBlock } from "../../components/docs/CodeBlock";
import { DocPage } from "../../components/docs/DocPage";

export function TideFolderPage() {
  return (
    <DocPage
      title=".tide folder"
      description="Tide writes generated artifacts, test files, and visual baselines to .tide/ at the package root where you run commands."
    >
      <section className="doc-section">
        <h2>Overview</h2>
        <p>
          The <code>.tide/</code> directory is created on <code>tide init</code> and populated on{" "}
          <code>tide generate</code>. The manager and CLI read from it at dev and test time. Most
          files are regenerated on every scan — treat them as build output, not hand-edited source.
        </p>
        <p>
          Run all Tide commands from the package that owns <code>tide.config.ts</code> — that
          package&apos;s <code>.tide/</code> is the one that matters.
        </p>
      </section>

      <section className="doc-section">
        <h2>Directory layout</h2>
        <CodeBlock
          language="text"
          code={`.tide/
├── manifest.json              # discovered components
├── props.json                 # extracted prop schemas
├── bindings.json              # inferred callback → state wiring
├── config.json                # snapshot of tide.config.ts options
├── scan-report.json           # scan warnings and diagnostics
├── stories.generated.ts       # lazy story modules for preview
├── tokens.json                # copy of your tokens file (if configured)
│
├── baselines/                 # visual regression baselines (commit)
│   ├── Button.png
│   ├── forms/
│   │   └── Checkbox.png
│   └── Button.snapshot.json
│
├── interactions/              # callback wiring overrides (commit)
│   └── forms/
│       └── Checkbox.json
│
├── tests/                     # interaction test steps (manager-authored)
│   └── Button.json
│
└── reports/                   # run output (gitignored)
    ├── visual.json
    ├── interactions.json
    ├── interactions-verify.json
    ├── Button-current.png
    ├── Button-diff.png
    └── Button-diff.json`}
        />
      </section>

      <section className="doc-section">
        <h2>Generated on scan</h2>
        <p>
          Rewritten by <code>tide generate</code> (and automatically during <code>tide dev</code>{" "}
          when source or config changes):
        </p>
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
                  <code>manifest.json</code>
                </td>
                <td>
                  Discovered components with stable ids, export names, file paths, and sidebar
                  grouping.
                </td>
              </tr>
              <tr>
                <td>
                  <code>props.json</code>
                </td>
                <td>
                  Extracted prop schemas keyed by component id — drives Props panel controls and Docs
                  tables.
                </td>
              </tr>
              <tr>
                <td>
                  <code>bindings.json</code>
                </td>
                <td>
                  Inferred interaction bindings (e.g. <code>onChange</code> → <code>checked</code>).
                  Used to auto-wire interactive previews.
                </td>
              </tr>
              <tr>
                <td>
                  <code>config.json</code>
                </td>
                <td>
                  Snapshot of <code>packageName</code>, <code>defaults</code>, and{" "}
                  <code>componentsDir</code> from <code>tide.config.ts</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>scan-report.json</code>
                </td>
                <td>
                  Diagnostics: unknown props, components with no props, scan warnings. Check this
                  when controls or discovery look wrong.
                </td>
              </tr>
              <tr>
                <td>
                  <code>stories.generated.ts</code>
                </td>
                <td>
                  Auto-generated lazy story modules consumed by the preview server. Do not edit
                  manually.
                </td>
              </tr>
              <tr>
                <td>
                  <code>tokens.json</code>
                </td>
                <td>
                  Copy of the <code>tokens</code> path from config. Shown under{" "}
                  <strong>Foundations → Tokens</strong> in the manager.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2>Authored in the manager</h2>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Created by</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>tests/{"{componentId}"}.json</code>
                </td>
                <td>Tests tab</td>
                <td>
                  Interaction test steps (click, type, assert). Run with <code>tide test</code> in CI
                  or from the manager.
                </td>
              </tr>
              <tr>
                <td>
                  <code>interactions/{"{componentId}"}.json</code>
                </td>
                <td>Interactions tab</td>
                <td>
                  Callback → state wiring overrides. Merged on top of inferred{" "}
                  <code>bindings.json</code> entries.
                </td>
              </tr>
              <tr>
                <td>
                  <code>baselines/{"{componentId}"}.png</code>
                </td>
                <td>Visual tab</td>
                <td>
                  Committed screenshot baselines for visual regression. Nested ids use subfolders
                  (e.g. <code>baselines/forms/Checkbox.png</code>).
                </td>
              </tr>
              <tr>
                <td>
                  <code>baselines/{"{componentId}"}.snapshot.json</code>
                </td>
                <td>Visual tab</td>
                <td>
                  Multi-layer snapshot metadata stored alongside the baseline PNG.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2>Reports (gitignored)</h2>
        <p>
          Written by <code>tide test</code>, <code>tide visual</code>, and in-manager runs. Safe to
          delete — they are recreated on the next run.
        </p>
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
                  <code>reports/visual.json</code>
                </td>
                <td>Summary of the latest visual regression run.</td>
              </tr>
              <tr>
                <td>
                  <code>reports/interactions.json</code>
                </td>
                <td>Headless interaction test results from <code>tide test</code>.</td>
              </tr>
              <tr>
                <td>
                  <code>reports/interactions-verify.json</code>
                </td>
                <td>Runtime verification output and generated states from interaction tuning.</td>
              </tr>
              <tr>
                <td>
                  <code>reports/{"{id}"}-current.png</code>
                </td>
                <td>Latest screenshot captured during a visual compare run.</td>
              </tr>
              <tr>
                <td>
                  <code>reports/{"{id}"}-diff.png</code>
                </td>
                <td>Pixel diff image reviewed in the Visual tab.</td>
              </tr>
              <tr>
                <td>
                  <code>reports/{"{id}"}-diff.json</code>
                </td>
                <td>Per-layer diff detail fetched on demand by the manager.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2>Git</h2>
        <p>
          <code>tide init</code> adds rules to <code>.gitignore</code> so generated artifacts stay
          local, with two exceptions you typically commit:
        </p>
        <CodeBlock
          language="text"
          code={`# Tide generated artifacts (commit baselines + interaction wiring)
.tide/*
!.tide/baselines/
!.tide/baselines/**
!.tide/interactions/
!.tide/interactions/**`}
        />
        <ul>
          <li>
            <strong>Commit</strong> <code>.tide/baselines/</code> — visual regression needs shared
            baselines across the team and CI.
          </li>
          <li>
            <strong>Commit</strong> <code>.tide/interactions/</code> — callback wiring overrides
            are team-owned configuration.
          </li>
          <li>
            <strong>Gitignored</strong> — everything else under <code>.tide/</code>, including{" "}
            <code>manifest.json</code>, <code>props.json</code>, <code>tests/</code>, and{" "}
            <code>reports/</code>.
          </li>
        </ul>
        <p>
          To version-control interaction tests for CI, add a <code>.gitignore</code> exception for{" "}
          <code>.tide/tests/</code> or copy tests into your own fixture layout.
        </p>
      </section>

      <section className="doc-section">
        <h2>When files update</h2>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Trigger</th>
                <th>What changes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>tide generate</code>
                </td>
                <td>All scan artifacts: manifest, props, bindings, stories, scan-report, config snapshot, tokens copy.</td>
              </tr>
              <tr>
                <td>
                  <code>tide dev</code>
                </td>
                <td>Re-scans when component source, <code>tide.config.ts</code>, <code>tokens.json</code>, or the preview wrapper changes.</td>
              </tr>
              <tr>
                <td>Manager Tests tab</td>
                <td>
                  <code>.tide/tests/{"{componentId}"}.json</code>
                </td>
              </tr>
              <tr>
                <td>Manager Interactions tab</td>
                <td>
                  <code>.tide/interactions/{"{componentId}"}.json</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>tide visual --update</code> or Visual tab
                </td>
                <td>
                  <code>.tide/baselines/</code> PNG + snapshot files
                </td>
              </tr>
              <tr>
                <td>
                  <code>tide test</code> / <code>tide visual</code>
                </td>
                <td>
                  <code>.tide/reports/</code> outputs
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2>Related</h2>
        <ul>
          <li>
            <Link to="/docs/config-reference">Config reference</Link> — options that flow into{" "}
            <code>config.json</code> and <code>tokens.json</code>
          </li>
          <li>
            <Link to="/docs/quick-start">Quick start</Link> — <code>tide init</code>,{" "}
            <code>tide generate</code>, and testing commands
          </li>
        </ul>
      </section>
    </DocPage>
  );
}
