const ROWS = [
  { label: "Story files", storybook: "Write .stories.tsx for every component", tide: "Scan src/**/*.tsx automatically" },
  { label: "Prop controls", storybook: "Hand-written argTypes", tide: "Inferred from TypeScript types" },
  { label: "Accessibility", storybook: "Addon + setup", tide: "Built-in, run with tide test" },
  { label: "Visual regression", storybook: "Chromatic or custom addon", tide: "tide visual + in-app diff review" },
  { label: "Interaction tests", storybook: "play functions in stories", tide: "Tests tab + .tide/tests/*.json" },
  { label: "Design tokens", storybook: "Addon or custom panel", tide: "Foundations → Tokens from config" },
  { label: "Config surface", storybook: "main.ts + preview.ts + addons", tide: "tide.config.ts + tide init" },
  { label: "Monorepo", storybook: "Per-package or shared config", tide: "Run from the owning package" },
];

export function Comparison() {
  return (
    <section id="compare" className="section comparison">
      <div className="section__inner">
        <div className="section__header">
          <p className="section__eyebrow">Why Tide</p>
          <h2 className="section__title">Storybook made you maintain two codebases. Tide doesn&apos;t.</h2>
          <p className="section__subtitle">
            Your components already know what they are. Tide listens — no parallel story layer
            required.
          </p>
        </div>

        <div className="comparison__table-wrap">
          <table className="comparison__table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col" className="comparison__col-storybook">
                  Storybook
                </th>
                <th scope="col" className="comparison__col-tide">
                  Tide
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="comparison__row-label">
                    {row.label}
                  </th>
                  <td className="comparison__cell comparison__cell--muted">{row.storybook}</td>
                  <td className="comparison__cell comparison__cell--highlight">{row.tide}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
