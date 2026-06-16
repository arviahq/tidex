import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tidex:theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
