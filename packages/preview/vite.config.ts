import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

declare const __TIDE_ROOT__: string;

export default defineConfig(({ mode }) => {
  const userRoot = typeof __TIDE_ROOT__ !== "undefined" && __TIDE_ROOT__
    ? __TIDE_ROOT__
    : process.env.TIDE_ROOT ?? "";

  const alias: Record<string, string> = {};
  if (userRoot) {
    alias["@user"] = userRoot;
    const storiesPath = path.join(userRoot, ".tide", "stories.generated.ts");
    if (fs.existsSync(storiesPath)) {
      alias["virtual:tide-stories"] = storiesPath;
    }
  }

  return {
    plugins: [react()],
    define: {
      __TIDE_ROOT__: JSON.stringify(userRoot),
    },
    resolve: { alias },
    server: {
      port: 6007,
      cors: true,
      fs: {
        allow: userRoot ? [path.resolve(__dirname, ".."), userRoot] : [path.resolve(__dirname, "..")],
      },
    },
    optimizeDeps: {
      exclude: ["virtual:tide-stories"],
    },
  };
});
