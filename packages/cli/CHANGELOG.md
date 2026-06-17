# @tidex/cli

## 0.0.4

### Patch Changes

- Updated dependencies [b252622]
  - @tidex/scanner@0.0.4
  - @tidex/core@0.0.4
  - @tidex/testing@0.0.4
  - @tidex/visual@0.0.4
  - @tidex/docs@0.0.4
  - @tidex/manager@0.0.3
  - @tidex/preview@0.0.3

## 0.0.3

### Patch Changes

- dec7757: Config can now be authored with only `@tidex/cli` installed. `tidex init` scaffolds `import { defineConfig } from "@tidex/cli/config"`, and that entry bundles `@tidex/core` so it resolves from the project root regardless of installer layout. Fixes `ERR_MODULE_NOT_FOUND: Cannot find package '@tidex/core'` when loading `tidex.config.ts` under pnpm.

  Upgrading: change your config import from `@tidex/core` to `@tidex/cli/config` and remove `@tidex/core` from `devDependencies`.

  - @tidex/core@0.0.3
  - @tidex/scanner@0.0.3
  - @tidex/testing@0.0.3
  - @tidex/visual@0.0.3
  - @tidex/docs@0.0.3
  - @tidex/manager@0.0.2
  - @tidex/preview@0.0.2

## 0.0.2

### Patch Changes

- 475f107: Rename the CLI npm package from `tidex` to `@tidex/cli` — the unscoped `tidex` name is already taken on npm. The `tidex` binary is unchanged.
  - @tidex/core@0.0.2
  - @tidex/scanner@0.0.2
  - @tidex/testing@0.0.2
  - @tidex/visual@0.0.2
  - @tidex/docs@0.0.2
