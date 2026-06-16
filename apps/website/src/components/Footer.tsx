import { Link } from "@tanstack/react-router";
import { TideLogo } from "./TideLogo";
import { DOC_NAV } from "../docs/nav";

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
          {DOC_NAV.map((link) => (
            <Link key={link.to} to={link.to} className="footer__link">
              {link.label}
            </Link>
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
