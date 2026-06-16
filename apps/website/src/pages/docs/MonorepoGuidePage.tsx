import { CodeBlock } from "../../components/docs/CodeBlock";
import { DocPage } from "../../components/docs/DocPage";

export function MonorepoGuidePage() {
  return (
    <DocPage
      title="Monorepo guide"
      description="Run Tide from the package that owns the components, not the monorepo root."
    >
      <section className="doc-section">
        <h2>Typical layout</h2>
        <CodeBlock
          language="text"
          code={`my-monorepo/
├── packages/
│   ├── ui/                      ← tide.config.ts here
│   │   ├── tide.config.ts
│   │   ├── tokens.json
│   │   ├── package.json         ← name: "@myorg/ui"
│   │   └── src/
│   │       ├── components/
│   │       ├── preview/
│   │       │   └── TideWrapper.tsx
│   │       └── index.ts
│   └── app/                     ← consumes @myorg/ui, no Tide config needed
└── pnpm-workspace.yaml`}
        />
      </section>

      <section className="doc-section">
        <h2>Setup</h2>
        <p>From <code>packages/ui/</code>:</p>
        <CodeBlock
          code={`pnpm exec tide init        # once
pnpm exec tide generate
pnpm exec tide dev`}
        />
      </section>

      <section className="doc-section">
        <h2>Config for a workspace package</h2>
        <CodeBlock
          filename="tide.config.ts"
          code={`import { defineConfig } from "@tide/core";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**"],
    componentsDir: "src/components",
  },
  packageName: "@myorg/ui",
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TideWrapper.tsx",
  },
});`}
        />
        <p>
          <code>packageName</code> makes the Docs panel show consumer imports:
        </p>
        <CodeBlock code={`import { Button } from "@myorg/ui";`} />
      </section>

      <section className="doc-section">
        <h2>Path aliases</h2>
        <p>
          Tide walks up to the nearest <code>tsconfig.json</code> and uses{" "}
          <code>vite-tsconfig-paths</code> in the preview server, so aliases like{" "}
          <code>@/components/Button</code> work in component source as long as they resolve in
          your tsconfig.
        </p>
      </section>

      <section className="doc-section">
        <h2>Workspace dependencies</h2>
        <p>
          If components import other workspace packages, add them to{" "}
          <code>packages/ui/package.json</code> and ensure the preview can resolve them. Use{" "}
          <code>preview.vite</code> for any extra build plugins those packages need.
        </p>
      </section>

      <section className="doc-section">
        <h2>CI</h2>
        <p>In the UI package:</p>
        <CodeBlock
          code={`pnpm exec tide generate
pnpm exec tide test
pnpm exec tide visual`}
        />
        <p>
          Commit <code>.tide/baselines/</code> for visual regression; other <code>.tide/*</code>{" "}
          artifacts are gitignored by default.
        </p>
      </section>

      <section className="doc-section">
        <h2>Multiple packages with components</h2>
        <p>Each component library gets its own <code>tide.config.ts</code> and dev server ports.</p>
        <p>Override if running two at once:</p>
        <CodeBlock
          code={`export default defineConfig({
  managerPort: 6016,
  previewPort: 6017,
});`}
        />
      </section>
    </DocPage>
  );
}
