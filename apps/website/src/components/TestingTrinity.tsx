const PILLARS = [
  {
    id: "accessibility",
    step: "01",
    title: "Accessibility",
    cli: "tidex test",
    description:
      "Run accessibility checks against every component. Catch violations before they ship to production.",
    status: "passing",
  },
  {
    id: "interactions",
    step: "02",
    title: "Interactions",
    cli: "Tests tab",
    description:
      "Record click, type, and assert steps in the manager. Saved to .tidex/tests/ and runnable in CI.",
    status: "recording",
  },
  {
    id: "visual",
    step: "03",
    title: "Visual",
    cli: "tidex visual",
    description:
      "Capture baselines, compare pixel diffs, and review changes in-app. Threshold configurable in config.",
    status: "diff",
  },
];

export function TestingTrinity() {
  return (
    <section id="testing" className="section testing">
      <div className="section__inner">
        <div className="section__header">
          <p className="section__eyebrow">Scan → Preview → Verify</p>
          <h2 className="section__title">Your design system shouldn&apos;t ship untested.</h2>
          <p className="section__subtitle">
            Accessibility, interaction, and visual regression — three pillars, one workflow, zero
            addon hunting.
          </p>
        </div>

        <div className="testing__flow" aria-hidden="true">
          <span className="testing__flow-step">Scan</span>
          <span className="testing__flow-arrow">→</span>
          <span className="testing__flow-step">Preview</span>
          <span className="testing__flow-arrow">→</span>
          <span className="testing__flow-step testing__flow-step--accent">Verify</span>
        </div>

        <div className="testing__grid">
          {PILLARS.map((pillar) => (
            <article key={pillar.id} className="testing-card">
              <div className="testing-card__top">
                <span className="testing-card__step">{pillar.step}</span>
                <span className={`testing-card__badge testing-card__badge--${pillar.status}`}>
                  {pillar.status === "passing" && "✓ Passing"}
                  {pillar.status === "recording" && "● Recording"}
                  {pillar.status === "diff" && "△ 2px diff"}
                </span>
              </div>
              <h3 className="testing-card__title">{pillar.title}</h3>
              <code className="testing-card__cli">{pillar.cli}</code>
              <p className="testing-card__desc">{pillar.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
