# Tidex

**Components in. Explorer out.**

Tidex is a next-generation component explorer for React design systems. Scan your source, get a full manager with live controls, auto-generated docs, design tokens, and built-in accessibility, interaction, and visual testing — without maintaining `.stories.tsx` files.

## Why Tidex

| Storybook                                       | Tidex                                         |
| ----------------------------------------------- | --------------------------------------------- |
| Write `.stories.tsx` for every component        | Scan `src/**/*.tsx` automatically             |
| Hand-written `argTypes`                         | Controls inferred from TypeScript types       |
| Addons for a11y, visual, interactions           | Tests, Visual, and Interactions tabs built in |
| Config sprawl (`main.ts`, `preview.ts`, addons) | One `tidex.config.ts`                         |

Your components already know what they are. Tidex listens.

## Quick start

Add Tidex to the package that owns your components:

```bash
pnpm add -D tidex
pnpm exec tidex init
pnpm exec tidex generate
pnpm exec tidex dev
```

Manager runs at `http://localhost:6006`, preview at `http://localhost:6007`.

### Try the example app

From this repo:

```bash
pnpm install
pnpm build
cd examples/react-app
pnpm exec tidex generate
pnpm exec tidex dev
```

### Minimal config

```ts
import { defineConfig } from "@tidex/core";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**"],
    componentsDir: "src/components",
  },
  packageName: "@myorg/ui",
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TidexWrapper.tsx",
  },
});
```

## CLI

| Command                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `tidex init`               | Scaffold `tidex.config.ts`, preview wrapper, and `.gitignore` rules |
| `tidex generate`           | Scan components and write `.tidex/` artifacts                       |
| `tidex generate --verbose` | Generate with scan diagnostics                                      |
| `tidex doctor`             | Validate setup and scan health                                      |
| `tidex dev`                | Start manager + preview servers                                     |
| `tidex build`              | Generate build artifacts                                            |
| `tidex test`               | Run accessibility and interaction tests                             |
| `tidex visual`             | Run visual regression tests                                         |
| `tidex visual --update`    | Accept current UI as baseline                                       |

## Manager

The manager UI gives you:

- **Props** — live controls from extracted TypeScript types
- **Variants** — computed variant matrix from prop unions
- **Docs** — auto-generated prop tables, import snippets, and usage examples
- **Tests** — author interaction steps, run headlessly in CI
- **Visual** — capture baselines, compare screenshots, review diffs
- **Interactions** — wire callbacks to state, override inferred bindings
- **Foundations** — design tokens from `tokens.json`

## Testing

Install Playwright browsers once per project:

```bash
pnpm exec playwright install chromium
```

**Interaction tests** — author in the Tests tab, saved to `.tidex/tests/<Component>.json`:

```bash
pnpm exec tidex test
```

**Visual regression** — capture baselines in the Visual tab. Commit `.tidex/baselines/` to git (`tidex init` gitignores `.tidex/*` but tracks baselines and interaction wiring):

```bash
pnpm exec tidex visual           # compare against baselines
pnpm exec tidex visual --update  # refresh baselines
```

## `.tidex/` folder

`tidex generate` writes scan artifacts to `.tidex/` at the package root:

| File                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `manifest.json`        | Discovered components with stable ids |
| `props.json`           | Extracted prop schemas                |
| `bindings.json`        | Inferred callback → state wiring      |
| `stories.generated.ts` | Lazy story modules for preview        |
| `scan-report.json`     | Scan warnings and diagnostics         |
| `config.json`          | Snapshot of config options            |
| `tokens.json`          | Copy of your design tokens file       |

Manager-authored files: `tests/`, `interactions/`, `baselines/`. Run output lands in `reports/`. See the [website docs](#documentation) or run `pnpm website:dev` for the full breakdown.

## Documentation

- [Component authoring](./docs/component-authoring.md) — exports, props, and controls
- [Configuration reference](./docs/config-reference.md) — every `tidex.config.ts` option
- [Monorepo guide](./docs/monorepo.md) — running Tidex in a workspace package
- [Design system folder structure](./docs/design-systems.md) — layout conventions for component libraries
- [Troubleshooting](./docs/troubleshooting.md) — common issues and fixes

The marketing site and extended docs live in `apps/website` (`pnpm website:dev`).

## Plugin API

```ts
import type { TidexPlugin } from "@tidex/core";

export default {
  name: "my-plugin",
  setup(ctx) {
    ctx.addPanel({ id: "custom", title: "Custom", component: "./MyPanel" });
    ctx.onGenerate(async () => {
      /* hook */
    });
  },
} satisfies TidexPlugin;
```

Register in `tidex.config.ts`:

```ts
import { defineConfig } from "@tidex/core";
import myPlugin from "./my-plugin";

export default defineConfig({
  plugins: [myPlugin],
});
```

## Packages

| Package          | Description                                            |
| ---------------- | ------------------------------------------------------ |
| `tidex` (cli)    | CLI entry point                                        |
| `@tidex/core`    | Shared types, config, plugin API                       |
| `@tidex/scanner` | Component discovery, prop extraction, story generation |
| `@tidex/manager` | Manager UI                                             |
| `@tidex/preview` | Preview iframe host                                    |
| `@tidex/runtime` | React preview renderer                                 |
| `@tidex/react`   | Control helpers, variant computation                   |
| `@tidex/docs`    | Auto-documentation generator                           |
| `@tidex/visual`  | Visual diff testing (Playwright + pixelmatch)          |
| `@tidex/testing` | Accessibility and interaction testing                  |

## Developing Tidex

```bash
pnpm install
pnpm build
pnpm quality          # lint + format
pnpm test
pnpm example:dev      # example app vite dev server
pnpm website:dev      # marketing site at localhost:3000
```

Requires Node ≥ 20. Uses [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) for linting and formatting.
