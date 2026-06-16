import { CodeBlock } from "./docs/CodeBlock";

const CONFIG_CODE = `import { defineConfig } from "@tide/core";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    componentsDir: "src/components",
  },
  packageName: "@myorg/ui",
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TideWrapper.tsx",
  },
  visual: { threshold: 0.1 },
  plugins: [myPlugin],
});`;

export function ConfigExample() {
  return (
    <section className="section config">
      <div className="section__inner config__inner">
        <div className="config__copy">
          <p className="section__eyebrow">One config file</p>
          <h2 className="section__title">Everything in tide.config.ts</h2>
          <p className="section__subtitle">
            Scan paths, package name, design tokens, preview wrapper, visual thresholds, and plugins
            — all in one place. Run <code>tide doctor</code> to validate your setup.
          </p>
          <ul className="config__list">
            <li>Auto-discovers components from globs</li>
            <li>Per-component default arg overrides</li>
            <li>Vite config merge for Tailwind, SVGR, etc.</li>
            <li>Plugin API for custom panels and hooks</li>
          </ul>
        </div>

        <CodeBlock code={CONFIG_CODE} filename="tide.config.ts" />
      </div>
    </section>
  );
}
