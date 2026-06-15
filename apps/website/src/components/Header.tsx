import { TideLogo } from "./TideLogo";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../hooks/useTheme";

type HeaderProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#testing", label: "Testing" },
  { href: "#compare", label: "Compare" },
  { href: "https://github.com/arviahq/tide", label: "GitHub", external: true },
];

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__inner">
        <a href="#" className="header__brand">
          <span className="header__logo" aria-hidden="true">
            <TideLogo size={16} />
          </span>
          <span className="header__name">Tide</span>
        </a>

        <nav className="header__nav" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="header__link"
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header__actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <a href="#start" className="btn btn--primary btn--sm">
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
