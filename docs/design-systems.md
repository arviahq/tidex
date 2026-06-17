# Design system folder structure

Tidex is convention-driven: it scans `.tsx` files, discovers exported React components, extracts props from the same file, and builds the sidebar from folder paths. This guide describes a folder layout that works with Tidex out of the box.

See also: [examples/react-app](../examples/react-app) for a working reference.

## Install

`@tidex/cli` is the only dependency you need — it pulls in everything else:

```
pnpm add -D @tidex/cli
pnpm exec tidex init
pnpm exec tidex generate
pnpm exec tidex dev
```

Author `tidex.config.ts` against `@tidex/cli/config`:

```ts
import { defineConfig } from "@tidex/cli/config";
```

> **Upgrading from an earlier version?** Older `tidex init` scaffolded `import { defineConfig } from "@tidex/core"`, which fails under pnpm with `ERR_MODULE_NOT_FOUND: @tidex/core` (core is a transitive dep, not resolvable from your project root). Change that single import to `@tidex/cli/config` and drop `@tidex/core` from your `devDependencies` — `@tidex/cli` is all you need.

## Recommended layout

```
my-design-system/
├── tidex.config.ts          # run tidex from this package root
├── tokens.json             # optional — shows in Foundations → Tokens
├── package.json
└── src/
    ├── preview/
    │   └── TidexWrapper.tsx # ThemeProvider / context — not a “story”
    ├── theme/              # tokens, CSS vars, utilities (.ts — not scanned)
    │   └── tokens.ts
    ├── hooks/              # (.ts — not scanned)
    ├── utils/              # (.ts — not scanned)
    └── components/         # sidebar grouping is based on folders under here
        ├── Button.tsx
        ├── Badge.tsx
        ├── forms/
        │   ├── Checkbox.tsx
        │   ├── Input.tsx
        │   └── ToggleGroup.tsx
        ├── overlays/
        │   ├── Modal.tsx
        │   └── Banner.tsx
        ├── feedback/
        │   └── Alert.tsx
        ├── data/
        │   ├── DataTable.tsx
        │   └── StatCard.tsx
        └── composite/      # composed patterns built from primitives
            └── ProfileCard.tsx
```

## Why this works

### Sidebar folders come from `src/components/`

Tidex looks for a `components` segment in the file path and uses everything after it as folder groups in the manager sidebar.

| File path                           | Sidebar                |
| ----------------------------------- | ---------------------- |
| `src/components/forms/Checkbox.tsx` | **Forms → Checkbox**   |
| `src/components/Button.tsx`         | **Button** (top level) |

Use short, stable folder names — they become sidebar labels (capitalized automatically):

```
components/
  forms/          → Forms
  overlays/       → Overlays
  feedback/       → Feedback
  navigation/     → Navigation
  layout/         → Layout
  typography/     → Typography
  data-display/   → Data-display
  composite/      → Composite (patterns, not atoms)
```

Two levels is usually enough (`forms/Checkbox.tsx`). Deeper nesting works but can make the tree heavy.

### One previewable component per file

Tidex discovers components that:

- Are **exported** (`export function`, `export const`, or `export default`)
- Have a **PascalCase** name (e.g. `Button`, not `button`)
- Return **JSX** in the function body

Put utilities, hooks, and theme logic in `.ts` files, or in folders excluded from the scan (see below).

**Supported export patterns:**

```tsx
export function Button() {
  return <button />;
}

export const Button = () => <button />;

export default function Button() {
  return <button />;
}
```

Filename should match the component name when possible (`Button.tsx`).

### Props live in the same file

Prop extraction is **syntactic** — it does not follow imports into other modules. For full Controls panel support, define props inline or in the same file as the component:

```tsx
// Button.tsx — ideal
export type ButtonProps = {
  variant: "primary" | "secondary";
  size: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({ variant, size, disabled, onClick }: ButtonProps) {
  return <button … />;
}
```

Tidex looks for `{Name}Props`, `Props`, or `I{Name}Props`, or reads the first parameter type directly.

| Prop shape                                        | Controls support                    |
| ------------------------------------------------- | ----------------------------------- |
| String/number/boolean literals                    | Full controls                       |
| Union literals (`"primary" \| "secondary"`)       | Dropdown                            |
| Same-file type aliases and interfaces             | Resolved                            |
| Imported types (e.g. extending a library’s props) | Reported as `unknown` — no controls |

`children`, `className`, `style`, and `ref` are skipped automatically. `onXxx` callbacks appear in the **Interactions** tab instead of Props.

### Keep barrels as `.ts`, not `.tsx`

Use `index.ts` for your npm public API:

```ts
export { Button } from "./Button";
export { Checkbox } from "./forms/Checkbox";
```

Tidex scans `.tsx` only (per `scan.include`), so barrel files won’t create duplicate or phantom components.

### Minimal `tidex.config.ts`

```ts
import { defineConfig } from "@tidex/cli/config";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    exclude: [
      "**/preview/**", // ThemeProvider wrapper
      "**/internal/**", // building blocks you don't want in the catalog
      "**/*Template*.tsx", // scaffolding, not real components
    ],
  },
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TidexWrapper.tsx", // default export with { children }
  },
});
```

The preview **wrapper** is important for design systems that need `ThemeProvider`, a CSS reset, i18n, or other global context. Every story renders inside it:

```tsx
// src/preview/TidexWrapper.tsx
import type { ReactNode } from "react";
import { ThemeProvider } from "../theme/ThemeProvider";

export default function TidexWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
```

## What to scan vs exclude

| Location                           | Scanned?             | Purpose                     |
| ---------------------------------- | -------------------- | --------------------------- |
| `src/components/**/*.tsx`          | Yes                  | Component catalog + stories |
| `src/theme/`, `src/hooks/` (`.ts`) | No                   | Implementation details      |
| `src/preview/TidexWrapper.tsx`     | Yes, unless excluded | Provider shell              |
| `*.stories.tsx`, `*.test.tsx`      | Auto-excluded        | Legacy stories / tests      |
| `src/index.ts`                     | No                   | Package exports             |

Tidex always excludes these patterns on top of any `scan.exclude` you set:

- `**/*.stories.*`
- `**/*.story.*`
- `**/*.test.*`
- `**/*.spec.*`
- `**/*.d.ts`

## Monorepos

Run Tidex from the **package that owns the components**, not the monorepo root:

```
packages/
  ui/                 ← tidex.config.ts + tidex dev here
    src/components/…
  docs-site/          ← consumes @myorg/ui; no separate scan needed
```

Point `scan.include` at that package’s source. The default `src/**/*.tsx` is correct as long as you run commands from the package directory (e.g. `packages/ui/`).

## Anti-patterns

1. **Multiple PascalCase components in one `.tsx`** — each export with JSX becomes its own story. Sometimes fine for compound APIs (`Dialog` + `DialogContent`), often noisy.
2. **Props imported from another package or file** — controls won’t work. Keep a slim `{Name}Props` in the component file when needed.
3. **Providers mixed into `components/`** — they’ll show up as stories unless you add them to `scan.exclude`.
4. **Running tidex from a subdirectory** — Tidex can fall back to scanning the whole cwd, but you lose predictable `src/**` matching. Keep `tidex.config.ts` at the package root and run commands from there.

## Quick checklist

- [ ] `tidex.config.ts` at the design-system package root
- [ ] Components under `scan.componentsDir` (default `src/components/`) with category subfolders
- [ ] One exported PascalCase component per `.tsx` file
- [ ] `{Component}Props` (or inline param types) in the same file or a local types module
- [ ] `tokens.json` at the package root (optional)
- [ ] Preview wrapper for theme/context providers
- [ ] `scan.exclude` for preview shell and internal building blocks
- [ ] Public API barrels in `.ts` files only
- [ ] Run `tidex doctor` after setup

## Related docs

- [Component authoring](./component-authoring.md) — exports, props, `forwardRef`, `@tidex-skip`
- [Configuration reference](./config-reference.md) — all config options
- [Monorepo guide](./monorepo.md) — workspace packages
- [Troubleshooting](./troubleshooting.md) — when something doesn't work
