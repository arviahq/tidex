export type PreviewTheme = "light" | "dark";

const STORAGE_KEY = "tidex:preview-theme";

export function applyPreviewTheme(theme: PreviewTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function getInitialPreviewTheme(): PreviewTheme {
  const params = new URLSearchParams(window.location.search);
  const urlTheme = params.get("theme");
  if (urlTheme === "dark" || urlTheme === "light") {
    return urlTheme;
  }
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyCompactMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("compact") === "1") {
    document.documentElement.classList.add("preview-compact");
  }
}

export function applyVisualMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("visual") === "1") {
    document.documentElement.classList.add("preview-visual");
  }
}
