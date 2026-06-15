import { TerminalDemo } from "./TerminalDemo";
import { ManagerDemo } from "./ManagerDemo";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__mesh" aria-hidden="true">
        <svg className="hero__waves" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path
            className="hero__wave hero__wave--1"
            d="M0,160 C240,80 480,240 720,160 C960,80 1200,240 1440,160 L1440,320 L0,320 Z"
            fill="url(#wave-gradient)"
            opacity="0.15"
          />
          <path
            className="hero__wave hero__wave--2"
            d="M0,200 C360,120 540,280 900,200 C1080,140 1260,260 1440,200 L1440,320 L0,320 Z"
            fill="url(#wave-gradient)"
            opacity="0.08"
          />
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--brand-from)" />
              <stop offset="100%" stopColor="var(--brand-to)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

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
            <a href="#start" className="btn btn--primary">
              Start in 60 seconds
            </a>
            <a
              href="https://github.com/arviahq/tide"
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
