# Tide

A next-generation Storybook focused on speed, testing, design systems, and zero-boilerplate workflows.

## Quick Start

```bash
pnpm install
pnpm build
pnpm quality
cd examples/react-app
pnpm exec tide init   # optional if config exists
pnpm exec tide generate
pnpm exec tide dev
```

## Documentation

- [Design system folder structure](./docs/design-systems.md) — layout conventions for component libraries
- [Component authoring](./docs/component-authoring.md) — exports, props, and controls
- [Configuration reference](./docs/config-reference.md) — every `tide.config.ts` option
- [Monorepo guide](./docs/monorepo.md) — running Tide in a workspace package
- [Troubleshooting](./docs/troubleshooting.md) — common issues and fixes

## CLI Commands

- `tide init` — Initialize config, scaffold folders, and gitignore
- `tide dev` — Start manager (6006) + preview (6007)
- `tide generate` — Scan components and generate artifacts
- `tide generate --verbose` — Generate with scan diagnostics
- `tide doctor` — Validate setup and scan health
- `tide build` — Generate build artifacts
- `tide test` — Run accessibility and interaction tests (requires Playwright)
- `tide visual` — Run visual regression tests (requires Playwright)
- `tide visual --update` — Refresh visual baselines

## Testing

Install Playwright browsers once per project:

```bash
pnpm exec playwright install chromium
```

### Interaction tests

Author steps in the manager **Tests** tab. Saved to `.tide/tests/<Component>.json`. Run in the manager or headlessly:

```bash
pnpm exec tide test
```

### Visual regression

Use the manager **Visual** tab to capture baselines, compare screenshots, and review diffs. Baselines live in `.tide/baselines/` and should be **committed to git** in consumer apps (`tide init` ignores `.tide/*` but tracks baselines).

```bash
pnpm exec tide visual           # compare all components
pnpm exec tide visual --update  # accept current UI as baseline
```

Optional threshold in `tide.config.ts`:

```typescript
export default defineConfig({
  visual: { threshold: 0.1 },
});
```

Uses [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) at the repo root:

```bash
pnpm lint          # check
pnpm lint:fix      # auto-fix lint issues
pnpm format        # check formatting
pnpm format:fix    # apply formatting
pnpm quality       # lint + format check
pnpm quality:fix   # lint:fix + format:fix
```

## Monorepo Packages

| Package           | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `tide` (cli)      | CLI entry point                                                              |
| `@tide/core`      | Shared types, config, plugin API                                             |
| `@tide/scanner`   | Component discovery, prop extraction, story generation                       |
| `@tide/storybook` | Storybook (CSF) ingestion: discovery, codegen, Vite reuse, control hydration |
| `@tide/manager`   | Manager UI                                                                   |
| `@tide/preview`   | Preview iframe host                                                          |
| `@tide/runtime`   | React preview renderer                                                       |
| `@tide/react`     | Control helpers, variant computation                                         |
| `@tide/docs`      | Auto-documentation generator                                                 |
| `@tide/visual`    | Visual diff testing (Playwright + pixelmatch)                                |
| `@tide/testing`   | Accessibility and interaction testing                                        |

## Plugin API

```typescript
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

```typescript
import { defineConfig } from "@tide/core";
import myPlugin from "./my-plugin";

export default defineConfig({
  plugins: [myPlugin],
});
```
