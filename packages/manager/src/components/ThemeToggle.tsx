import { useTheme, type Theme } from "../hooks/useTheme";
import "./theme.css";

interface ThemeToggleProps {
  theme?: Theme;
  onToggle?: () => void;
}

export function ThemeToggle({ theme: themeProp, onToggle }: ThemeToggleProps = {}) {
  const internal = useTheme();
  const theme = themeProp ?? internal.theme;
  const toggle = onToggle ?? internal.toggle;
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="bb-theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="bb-theme-toggle__track" data-theme={theme}>
        <span className="bb-theme-toggle__icon bb-theme-toggle__icon--sun" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.75" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M7 1.25v1.5M7 11.25v1.5M1.25 7h1.5M11.25 7h1.5M2.86 2.86l1.06 1.06M10.08 10.08l1.06 1.06M2.86 11.14l1.06-1.06M10.08 3.92l1.06-1.06"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="bb-theme-toggle__icon bb-theme-toggle__icon--moon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9.75 2.1a5.25 5.25 0 1 0 2.15 7.15A4.75 4.75 0 0 1 9.75 2.1Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="bb-theme-toggle__thumb" aria-hidden="true" />
      </span>
    </button>
  );
}
