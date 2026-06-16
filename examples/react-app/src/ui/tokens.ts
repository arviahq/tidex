// Theme tokens as CSS custom properties, injected once into the document so
// every component reacts to the preview's light/dark toggle (which sets
// `data-theme` on <html>). Kept as an injected <style> rather than a .css file
// so the example stays dependency-free and tsc-clean (no css module decls).
//
// The scanner never executes this (it only parses component files), and the
// `document` guard keeps it inert in any non-browser context.

const TOKENS_CSS = `
:root {
  --ui-bg: #ffffff;
  --ui-bg-muted: #f8fafc;
  --ui-bg-subtle: #f1f5f9;
  --ui-border: #e2e8f0;
  --ui-border-strong: #cbd5e1;
  --ui-text: #0f172a;
  --ui-text-muted: #475569;
  --ui-text-soft: #64748b;
  --ui-primary: #4f46e5;
  --ui-primary-soft: #eef2ff;
  --ui-primary-strong: #4338ca;
  --ui-success: #059669;
  --ui-success-soft: #ecfdf5;
  --ui-warning: #d97706;
  --ui-warning-soft: #fffbeb;
  --ui-danger: #dc2626;
  --ui-danger-soft: #fef2f2;
  --ui-info: #2563eb;
  --ui-info-soft: #eff6ff;
  --ui-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --ui-shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
  --ui-shadow-lg: 0 24px 48px rgba(15, 23, 42, 0.14);
}

[data-theme="dark"] {
  --ui-bg: #0f172a;
  --ui-bg-muted: #1e293b;
  --ui-bg-subtle: #334155;
  --ui-border: #334155;
  --ui-border-strong: #475569;
  --ui-text: #f1f5f9;
  --ui-text-muted: #94a3b8;
  --ui-text-soft: #64748b;
  --ui-primary: #818cf8;
  --ui-primary-soft: #1e1b4b;
  --ui-primary-strong: #a5b4fc;
  --ui-success: #34d399;
  --ui-success-soft: #052e23;
  --ui-warning: #fbbf24;
  --ui-warning-soft: #2e1f05;
  --ui-danger: #f87171;
  --ui-danger-soft: #2e1011;
  --ui-info: #60a5fa;
  --ui-info-soft: #0c1f3d;
  --ui-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --ui-shadow-md: 0 8px 24px rgba(0, 0, 0, 0.45);
  --ui-shadow-lg: 0 24px 48px rgba(0, 0, 0, 0.55);
}
`;

const STYLE_ID = "ui-theme-tokens";

if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = TOKENS_CSS;
  document.head.appendChild(style);
}

export {};
