# Tide

**Components in. Explorer out.**

Tide is a next-generation component explorer for React design systems. Scan your source, get a full manager with live controls, auto-generated docs, design tokens, and built-in accessibility, interaction, and visual testing — without maintaining `.stories.tsx` files.

## Why Tide

| Storybook | Tide |
| --- | --- |
| Write `.stories.tsx` for every component | Scan `src/**/*.tsx` automatically |
| Hand-written `argTypes` | Controls inferred from TypeScript types |
| Addons for a11y, visual, interactions | Tests, Visual, and Interactions tabs built in |
| Config sprawl (`main.ts`, `preview.ts`, addons) | One `tide.config.ts` |

Your components already know what they are. Tide listens.

## Quick start

Add Tide to the package that owns your components:

```bash
pnpm add -D tide
pnpm exec tide init
pnpm exec tide generate
pnpm exec tide dev
```

Manager runs at `http://localhost:6006`, preview at `http://localhost:6007`.

### Try the example app

From this repo:

```bash
pnpm install
pnpm build
cd examples/react-app
pnpm exec tide generate
pnpm exec tide dev
```

### Minimal config

```ts
import { defineConfig } from "@tide/core";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**"],
    componentsDir: "src/components",
  },
  packageName: "@myorg/ui",
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TideWrapper.tsx",
  },
});
```

## CLI

| Command | Description |
| --- | --- |
| `tide init` | Scaffold `tide.config.ts`, preview wrapper, and `.gitignore` rules |
| `tide generate` | Scan components and write `.tide/` artifacts |
| `tide generate --verbose` | Generate with scan diagnostics |
| `tide doctor` | Validate setup and scan health |
| `tide dev` | Start manager + preview servers |
| `tide build` | Generate build artifacts |
| `tide test` | Run accessibility and interaction tests |
| `tide visual` | Run visual regression tests |
| `tide visual --update` | Accept current UI as baseline |

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

**Interaction tests** — author in the Tests tab, saved to `.tide/tests/<Component>.json`:

```bash
pnpm exec tide test
```

**Visual regression** — capture baselines in the Visual tab. Commit `.tide/baselines/` to git (`tide init` gitignores `.tide/*` but tracks baselines and interaction wiring):

```bash
pnpm exec tide visual           # compare against baselines
pnpm exec tide visual --update  # refresh baselines
```

## `.tide/` folder

`tide generate` writes scan artifacts to `.tide/` at the package root:

| File | Purpose |
| --- | --- |
| `manifest.json` | Discovered components with stable ids |
| `props.json` | Extracted prop schemas |
| `bindings.json` | Inferred callback → state wiring |
| `stories.generated.ts` | Lazy story modules for preview |
| `scan-report.json` | Scan warnings and diagnostics |
| `config.json` | Snapshot of config options |
| `tokens.json` | Copy of your design tokens file |

Manager-authored files: `tests/`, `interactions/`, `baselines/`. Run output lands in `reports/`. See the [website docs](#documentation) or run `pnpm website:dev` for the full breakdown.

## Documentation

- [Component authoring](./docs/component-authoring.md) — exports, props, and controls
- [Configuration reference](./docs/config-reference.md) — every `tide.config.ts` option
- [Monorepo guide](./docs/monorepo.md) — running Tide in a workspace package
- [Design system folder structure](./docs/design-systems.md) — layout conventions for component libraries
- [Troubleshooting](./docs/troubleshooting.md) — common issues and fixes

The marketing site and extended docs live in `apps/website` (`pnpm website:dev`).

## Plugin API

```ts
import type { TidePlugin } from "@tide/core";

export default {
  name: "my-plugin",
  setup(ctx) {
    ctx.addPanel({ id: "custom", title: "Custom", component: "./MyPanel" });
    ctx.onGenerate(async () => {
      /* hook */
    });
  },
} satisfies TidePlugin;
```

Register in `tide.config.ts`:

```ts
import { defineConfig } from "@tide/core";
import myPlugin from "./my-plugin";

export default defineConfig({
  plugins: [myPlugin],
});
```

## Packages

| Package | Description |
| --- | --- |
| `tide` (cli) | CLI entry point |
| `@tide/core` | Shared types, config, plugin API |
| `@tide/scanner` | Component discovery, prop extraction, story generation |
| `@tide/manager` | Manager UI |
| `@tide/preview` | Preview iframe host |
| `@tide/runtime` | React preview renderer |
| `@tide/react` | Control helpers, variant computation |
| `@tide/docs` | Auto-documentation generator |
| `@tide/visual` | Visual diff testing (Playwright + pixelmatch) |
| `@tide/testing` | Accessibility and interaction testing |

## Developing Tide

```bash
pnpm install
pnpm build
pnpm quality          # lint + format
pnpm test
pnpm example:dev      # example app vite dev server
pnpm website:dev      # marketing site at localhost:3000
```

Requires Node ≥ 20. Uses [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) for linting and formatting.
