import geistMonoUrl from "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2?url";

const style = document.createElement("style");
style.textContent = `@font-face {
  font-family: "Geist Mono";
  src: url("${geistMonoUrl}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`;
document.head.prepend(style);
