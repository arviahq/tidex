import { Link } from "@tanstack/react-router";
import { TidexLogo } from "./TidexLogo";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../hooks/useTheme";

type HeaderProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#testing", label: "Testing" },
  { href: "/#compare", label: "Compare" },
  { to: "/docs/quick-start", label: "Docs" },
  { href: "https://github.com/arviahq/tidex", label: "GitHub", external: true },
] as const;

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand">
          <span className="header__logo" aria-hidden="true">
            <TidexLogo size={16} />
          </span>
          <span className="header__name">Tidex</span>
        </Link>

        <nav className="header__nav" aria-label="Main">
          {NAV_LINKS.map((link) =>
            "external" in link ? (
              <a
                key={link.href}
                href={link.href}
                className="header__link"
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ) : "to" in link ? (
              <Link
                key={link.to}
                to={link.to}
                className="header__link"
                activeProps={{ className: "header__link header__link--active" }}
              >
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className="header__link">
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="header__actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <Link to="/docs/quick-start" className="btn btn--primary btn--sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
