---
"@tidex/cli": patch
---

Config can now be authored with only `@tidex/cli` installed. `tidex init` scaffolds `import { defineConfig } from "@tidex/cli/config"`, and that entry bundles `@tidex/core` so it resolves from the project root regardless of installer layout. Fixes `ERR_MODULE_NOT_FOUND: Cannot find package '@tidex/core'` when loading `tidex.config.ts` under pnpm.

Upgrading: change your config import from `@tidex/core` to `@tidex/cli/config` and remove `@tidex/core` from `devDependencies`.
