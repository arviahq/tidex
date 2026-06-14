# Monorepo guide

Run Tide from the **package that owns the components**, not the monorepo root.

## Typical layout

```
my-monorepo/
├── packages/
│   ├── ui/                      ← tide.config.ts here
│   │   ├── tide.config.ts
│   │   ├── tokens.json
│   │   ├── package.json         ← name: "@myorg/ui"
│   │   └── src/
│   │       ├── components/
│   │       ├── preview/
│   │       │   └── TideWrapper.tsx
│   │       └── index.ts
│   └── app/                     ← consumes @myorg/ui, no Tide config needed
└── pnpm-workspace.yaml
```

## Setup

From `packages/ui/`:

```bash
pnpm exec tide init        # once
pnpm exec tide generate
pnpm exec tide dev
```

## Config for a workspace package

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

`packageName` makes the Docs panel show consumer imports:

```tsx
import { Button } from "@myorg/ui";
```

## Path aliases

Tide walks up to the nearest `tsconfig.json` and uses `vite-tsconfig-paths` in the preview server, so aliases like `@/components/Button` work in component source as long as they resolve in your tsconfig.

## Workspace dependencies

If components import other workspace packages, add them to `packages/ui/package.json` and ensure the preview can resolve them. Use `preview.vite` for any extra build plugins those packages need.

## CI

In the UI package:

```bash
pnpm exec tide generate
pnpm exec tide test
pnpm exec tide visual
```

Commit `.tide/baselines/` for visual regression; other `.tide/*` artifacts are gitignored by default.

## Multiple packages with components

Each component library gets its own `tide.config.ts` and dev server ports. Override if running two at once:

```ts
export default defineConfig({
  managerPort: 6016,
  previewPort: 6017,
});
```
