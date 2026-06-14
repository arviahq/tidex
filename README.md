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

## CLI Commands

- `tide init` — Initialize config and gitignore
- `tide dev` — Start manager (6006) + preview (6007)
- `tide generate` — Scan components and generate artifacts
- `tide build` — Generate build artifacts
- `tide test` — Run accessibility tests (requires Playwright)
- `tide visual` — Run visual regression tests (requires Playwright)

## Lint & Format

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

| Package         | Description                                            |
| --------------- | ------------------------------------------------------ |
| `tide` (cli)    | CLI entry point                                        |
| `@tide/core`    | Shared types, config, plugin API                       |
| `@tide/scanner` | Component discovery, prop extraction, story generation |
| `@tide/manager` | Manager UI                                             |
| `@tide/preview` | Preview iframe host                                    |
| `@tide/runtime` | React preview renderer                                 |
| `@tide/react`   | Control helpers, variant computation                   |
| `@tide/docs`    | Auto-documentation generator                           |
| `@tide/visual`  | Visual diff testing                                    |
| `@tide/testing` | Accessibility testing                                  |

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
