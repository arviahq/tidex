import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/config-api.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["playwright", "playwright-core"],
  // Bundle @tidex/core into the build so `@tidex/cli/config` is fully
  // self-contained: a project that installs only @tidex/cli can author
  // tidex.config.ts with `import { defineConfig } from "@tidex/cli/config"`
  // and it resolves regardless of the installer's node_modules layout
  // (pnpm strict, npm/yarn hoist, etc.). defineConfig is a pure merge fn,
  // so a duplicated copy is harmless.
  noExternal: ["@tidex/core"],
});
