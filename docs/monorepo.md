# Monorepo guide

Run Tidex from the **package that owns the components**, not the monorepo root.

## Typical layout

```
my-monorepo/
├── packages/
│   ├── ui/                      ← tidex.config.ts here
│   │   ├── tidex.config.ts
│   │   ├── tokens.json
│   │   ├── package.json         ← name: "@myorg/ui"
│   │   └── src/
│   │       ├── components/
│   │       ├── preview/
│   │       │   └── TidexWrapper.tsx
│   │       └── index.ts
│   └── app/                     ← consumes @myorg/ui, no Tidex config needed
└── pnpm-workspace.yaml
```

## Setup

From `packages/ui/`:

```bash
pnpm exec tidex init        # once
pnpm exec tidex generate
pnpm exec tidex dev
```

## Config for a workspace package

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

`packageName` makes the Docs panel show consumer imports:

```tsx
import { Button } from "@myorg/ui";
```

## Path aliases

Tidex walks up to the nearest `tsconfig.json` and uses `vite-tsconfig-paths` in the preview server, so aliases like `@/components/Button` work in component source as long as they resolve in your tsconfig.

## Workspace dependencies

If components import other workspace packages, add them to `packages/ui/package.json` and ensure the preview can resolve them. Use `preview.vite` for any extra build plugins those packages need.

## CI

In the UI package:

```bash
pnpm exec tidex generate
pnpm exec tidex test
pnpm exec tidex visual
```

Commit `.tidex/baselines/` for visual regression; other `.tidex/*` artifacts are gitignored by default.

## Multiple packages with components

Each component library gets its own `tidex.config.ts` and dev server ports. Override if running two at once:

```ts
export default defineConfig({
  managerPort: 6016,
  previewPort: 6017,
});
```
