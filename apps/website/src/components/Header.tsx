import { useEffect, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 961px)").matches) closeMenu();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className={`header${menuOpen ? " header--menu-open" : ""}`}>
      <div className="header__inner">
        <Link to="/" className="header__brand" onClick={closeMenu}>
          <span className="header__logo" aria-hidden="true">
            <TidexLogo size={16} />
          </span>
          <span className="header__name">Tidex</span>
        </Link>

        <nav
          id="site-nav"
          className={`header__nav${menuOpen ? " header__nav--open" : ""}`}
          aria-label="Main"
        >
          {NAV_LINKS.map((link) =>
            "external" in link ? (
              <a
                key={link.href}
                href={link.href}
                className="header__link"
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ) : "to" in link ? (
              <Link
                key={link.to}
                to={link.to}
                className="header__link"
                activeProps={{ className: "header__link header__link--active" }}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className="header__link" onClick={closeMenu}>
                {link.label}
              </a>
            ),
          )}
          <Link
            to="/docs/quick-start"
            className="btn btn--primary btn--sm header__nav-cta"
            onClick={closeMenu}
          >
            Get started
          </Link>
        </nav>

        <div className="header__actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <Link to="/docs/quick-start" className="btn btn--primary btn--sm header__cta">
            Get started
          </Link>
          <button
            type="button"
            className="header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="header__menu-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
