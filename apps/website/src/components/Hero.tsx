import { Link } from "@tanstack/react-router";
import { TerminalDemo } from "./TerminalDemo";
import { ManagerDemo } from "./ManagerDemo";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__mesh" aria-hidden="true" />

      <div className="hero__inner">
        <div className="hero__copy">
          <p className="hero__eyebrow">Next-generation component explorer</p>
          <h1 className="hero__title">
            Components in.
            <br />
            <span className="hero__title-accent">Explorer out.</span>
          </h1>
          <p className="hero__subtitle">
            Zero-boilerplate Storybook alternative with auto-scan, docs, design tokens, and
            accessibility, interaction, and visual testing built in.
          </p>
          <div className="hero__actions">
            <Link to="/docs/quick-start" className="btn btn--primary">
              Start in 60 seconds
            </Link>
            <a
              href="https://github.com/arviahq/tidex"
              className="btn btn--ghost"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
          </div>
          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-value">0</span>
              <span className="hero__stat-label">story files required</span>
            </div>
            <div className="hero__stat">
              <span className="hero__stat-value">3</span>
              <span className="hero__stat-label">commands to dev</span>
            </div>
            <div className="hero__stat">
              <span className="hero__stat-value">∞</span>
              <span className="hero__stat-label">components scanned</span>
            </div>
          </div>
        </div>

        <div className="hero__demo">
          <TerminalDemo />
          <ManagerDemo />
        </div>
      </div>
    </section>
  );
}
