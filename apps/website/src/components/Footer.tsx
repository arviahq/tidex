import { TideLogo } from "./TideLogo";

const DOC_LINKS = [
  { href: "https://github.com/arviahq/tide#quick-start", label: "Quick start" },
  { href: "https://github.com/arviahq/tide/blob/main/docs/config-reference.md", label: "Config reference" },
  { href: "https://github.com/arviahq/tide/blob/main/docs/monorepo.md", label: "Monorepo guide" },
  { href: "https://github.com/arviahq/tide/blob/main/docs/component-authoring.md", label: "Component authoring" },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="footer__logo" aria-hidden="true">
            <TideLogo size={16} />
          </span>
          <div>
            <span className="footer__name">Tide</span>
            <p className="footer__tagline">Zero-boilerplate component explorer</p>
          </div>
        </div>

        <nav className="footer__nav" aria-label="Documentation">
          {DOC_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="footer__link" target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>

        <p className="footer__copy">
          Built by{" "}
          <a href="https://arviahq.com" target="_blank" rel="noreferrer" className="footer__link">
            Arvia
          </a>
        </p>
      </div>
    </footer>
  );
}
