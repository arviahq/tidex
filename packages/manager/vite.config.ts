import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

declare const __TIDE_ROOT__: string;

export default defineConfig({
  plugins: [react()],
  define: {
    __TIDE_ROOT__: JSON.stringify(process.env.TIDE_ROOT ?? ""),
    __TIDE_PREVIEW_URL__: JSON.stringify(
      process.env.TIDE_PREVIEW_URL ?? "http://localhost:6007",
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 6006,
  },
});
