import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

declare const __TIDEX_ROOT__: string;

export default defineConfig({
  plugins: [react()],
  define: {
    __TIDEX_ROOT__: JSON.stringify(process.env.TIDEX_ROOT ?? ""),
    __TIDEX_PREVIEW_URL__: JSON.stringify(process.env.TIDEX_PREVIEW_URL ?? "http://localhost:6007"),
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
