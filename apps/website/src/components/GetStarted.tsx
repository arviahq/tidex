import { Link } from "@tanstack/react-router";

export function GetStarted() {
  return (
    <section id="start" className="section cta">
      <div className="cta__glow" aria-hidden="true" />
      <div className="section__inner cta__inner">
        <h2 className="cta__title">Ride the tide.</h2>
        <p className="cta__subtitle">
          Three commands from zero to a full component explorer with docs and testing.
        </p>

        <div className="cta__commands">
          <div className="cta__command">
            <span className="cta__step">1</span>
            <code>pnpm add -D tide</code>
          </div>
          <div className="cta__command">
            <span className="cta__step">2</span>
            <code>pnpm exec tide init</code>
          </div>
          <div className="cta__command">
            <span className="cta__step">3</span>
            <code>pnpm exec tide dev</code>
          </div>
        </div>

        <div className="cta__actions">
          <Link to="/docs/quick-start" className="btn btn--primary btn--lg">
            Read the docs
          </Link>
          <a
            href="https://github.com/arviahq/tide"
            className="btn btn--ghost btn--lg"
            target="_blank"
            rel="noreferrer"
          >
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
