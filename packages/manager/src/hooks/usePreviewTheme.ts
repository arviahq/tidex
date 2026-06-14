import { useCallback, useState } from "react";
import type { Theme } from "./useTheme";

const STORAGE_KEY = "tide:preview-theme";

export function getStoredPreviewTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function usePreviewTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredPreviewTheme);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
