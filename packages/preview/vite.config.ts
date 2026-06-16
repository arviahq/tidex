import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

declare const __TIDEX_ROOT__: string;

export default defineConfig(() => {
  const userRoot =
    typeof __TIDEX_ROOT__ !== "undefined" && __TIDEX_ROOT__
      ? __TIDEX_ROOT__
      : (process.env.TIDEX_ROOT ?? "");

  const alias: Record<string, string> = {};
  if (userRoot) {
    alias["@user"] = userRoot;
    const storiesPath = path.join(userRoot, ".tidex", "stories.generated.ts");
    if (fs.existsSync(storiesPath)) {
      alias["virtual:tidex-stories"] = storiesPath;
    }
  }

  return {
    plugins: [react()],
    define: {
      __TIDEX_ROOT__: JSON.stringify(userRoot),
    },
    resolve: { alias },
    server: {
      port: 6007,
      cors: true,
      fs: {
        allow: userRoot
          ? [path.resolve(__dirname, ".."), userRoot]
          : [path.resolve(__dirname, "..")],
      },
    },
    optimizeDeps: {
      exclude: ["virtual:tidex-stories"],
    },
  };
});
