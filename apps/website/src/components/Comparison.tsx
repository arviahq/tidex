const ROWS = [
  { label: "Story files", storybook: "Write .stories.tsx for every component", tidex: "Scan src/**/*.tsx automatically" },
  { label: "Prop controls", storybook: "Hand-written argTypes", tidex: "Inferred from TypeScript types" },
  { label: "Accessibility", storybook: "Addon + setup", tidex: "Built-in, run with tidex test" },
  { label: "Visual regression", storybook: "Chromatic or custom addon", tidex: "tidex visual + in-app diff review" },
  { label: "Interaction tests", storybook: "play functions in stories", tidex: "Tests tab + .tidex/tests/*.json" },
  { label: "Design tokens", storybook: "Addon or custom panel", tidex: "Foundations → Tokens from config" },
  { label: "Config surface", storybook: "main.ts + preview.ts + addons", tidex: "tidex.config.ts + tidex init" },
  { label: "Monorepo", storybook: "Per-package or shared config", tidex: "Run from the owning package" },
];

export function Comparison() {
  return (
    <section id="compare" className="section comparison">
      <div className="section__inner">
        <div className="section__header">
          <p className="section__eyebrow">Why Tidex</p>
          <h2 className="section__title">Storybook made you maintain two codebases. Tidex doesn&apos;t.</h2>
          <p className="section__subtitle">
            Your components already know what they are. Tidex listens — no parallel story layer
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
                <th scope="col" className="comparison__col-tidex">
                  Tidex
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
                  <td className="comparison__cell comparison__cell--highlight">{row.tidex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
