import { defineConfig } from "@tide/core";

export default defineConfig({
  scan: { include: ["src/**/*.tsx"] },
  tokens: "tokens.json",
});
