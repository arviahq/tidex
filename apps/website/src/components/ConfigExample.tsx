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

        <div className="code-block">
          <div className="code-block__chrome">
            <span className="code-block__dot" />
            <span className="code-block__dot" />
            <span className="code-block__dot" />
            <span className="code-block__filename">tide.config.ts</span>
          </div>
          <pre className="code-block__pre">
            <code>
              <span className="hl-keyword">import</span>{" "}
              <span className="hl-title">{"{ defineConfig }"}</span>{" "}
              <span className="hl-keyword">from</span>{" "}
              <span className="hl-string">&quot;@tide/core&quot;</span>
              <span className="hl-punct">;</span>
              {"\n\n"}
              <span className="hl-keyword">export default</span>{" "}
              <span className="hl-title">defineConfig</span>
              <span className="hl-punct">({"{"}</span>
              {"\n  "}
              <span className="hl-attr">scan</span>
              <span className="hl-punct">: {"{"}</span>
              {"\n    "}
              <span className="hl-attr">include</span>
              <span className="hl-punct">: [</span>
              <span className="hl-string">&quot;src/**/*.tsx&quot;</span>
              <span className="hl-punct">],</span>
              {"\n    "}
              <span className="hl-attr">componentsDir</span>
              <span className="hl-punct">: </span>
              <span className="hl-string">&quot;src/components&quot;</span>
              <span className="hl-punct">,</span>
              {"\n  "}
              <span className="hl-punct">{"},"}</span>
              {"\n  "}
              <span className="hl-attr">packageName</span>
              <span className="hl-punct">: </span>
              <span className="hl-string">&quot;@myorg/ui&quot;</span>
              <span className="hl-punct">,</span>
              {"\n  "}
              <span className="hl-attr">tokens</span>
              <span className="hl-punct">: </span>
              <span className="hl-string">&quot;tokens.json&quot;</span>
              <span className="hl-punct">,</span>
              {"\n  "}
              <span className="hl-attr">preview</span>
              <span className="hl-punct">: {"{"}</span>
              {"\n    "}
              <span className="hl-attr">wrapper</span>
              <span className="hl-punct">: </span>
              <span className="hl-string">
                &quot;src/preview/TideWrapper.tsx&quot;
              </span>
              <span className="hl-punct">,</span>
              {"\n  "}
              <span className="hl-punct">{"},"}</span>
              {"\n  "}
              <span className="hl-attr">visual</span>
              <span className="hl-punct">: {"{"} </span>
              <span className="hl-attr">threshold</span>
              <span className="hl-punct">: </span>
              <span className="hl-number">0.1</span>{" "}
              <span className="hl-punct">{"},"}</span>
              {"\n  "}
              <span className="hl-attr">plugins</span>
              <span className="hl-punct">: [</span>
              <span className="hl-title">myPlugin</span>
              <span className="hl-punct">],</span>
              {"\n"}
              <span className="hl-punct">{"});"}</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
