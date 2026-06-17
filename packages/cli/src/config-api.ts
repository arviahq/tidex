// Lightweight config surface, re-exported so a project that installs only
// `@tidex/cli` can author `tidex.config.ts` with a single dependency. The
// config file is loaded by Node's native ESM importer (no bundling), so its
// imports must resolve from the project root — where pnpm only exposes direct
// dependencies. `@tidex/core` is a transitive dep of the CLI and therefore not
// resolvable there, but `@tidex/cli/config` is. This module deliberately avoids
// importing the CLI entry (vite/ink/etc.) to keep config loading cheap and free
// of import cycles with `loadConfig`.
export { defineConfig } from "@tidex/core";
export type { TidexConfig, TidexPlugin, PanelConfig } from "@tidex/core";
