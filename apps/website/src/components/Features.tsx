const FEATURES = [
  {
    id: "scan",
    title: "Auto-scan",
    cli: "tidex generate",
    description:
      "Drop components in a folder. Tidex discovers props, variants, and defaults automatically.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7h16M4 12h10M4 17h14"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="19" cy="17" r="3" stroke="currentColor" strokeWidth="1.75" />
        <path d="M21 19l1.5 1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    wide: true,
  },
  {
    id: "props",
    title: "Props & variants",
    description: "Live controls from TypeScript types. No hand-written argTypes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "docs",
    title: "Auto docs",
    description: "Import snippets and prop tables generated from your source.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    ),
  },
  {
    id: "tokens",
    title: "Design tokens",
    description: "Foundations panel wired to tokens.json in your config.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="12" cy="16" r="3" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    ),
  },
  {
    id: "visual",
    title: "Visual regression",
    cli: "tidex visual",
    description: "Capture baselines, compare screenshots, review diffs in the manager.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M3 16l4.5-4.5 3 3L15 10l6 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "interactions",
    title: "Interaction tests",
    cli: "tidex test",
    description: "Author steps in the Tests tab. Run headlessly in CI.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 5v14l11-7L8 5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "plugins",
    title: "Plugin API",
    description: "Extend with custom panels and generate hooks.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "monorepo",
    title: "Monorepo-native",
    description: "Run from the package that owns the components. Path aliases just work.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h6v6H4V6ZM14 6h6v6h-6V6ZM4 14h6v6H4v-6ZM14 14h6v6h-6v-6Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
      </svg>
    ),
    wide: true,
  },
];

export function Features() {
  return (
    <section id="features" className="section features">
      <div className="section__inner">
        <div className="section__header">
          <p className="section__eyebrow">Everything built in</p>
          <h2 className="section__title">No stories. No ceremony. Just your components.</h2>
          <p className="section__subtitle">
            Tidex scans your source, generates artifacts, and gives you a full explorer with docs,
            tokens, and testing — without maintaining parallel story files.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map((feature) => (
            <article
              key={feature.id}
              className={`feature-card${feature.wide ? " feature-card--wide" : ""}`}
            >
              <div className="feature-card__icon">{feature.icon}</div>
              <div className="feature-card__body">
                <div className="feature-card__head">
                  <h3 className="feature-card__title">{feature.title}</h3>
                  {feature.cli && <code className="feature-card__cli">{feature.cli}</code>}
                </div>
                <p className="feature-card__desc">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
