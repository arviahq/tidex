# Configuration reference

All options live in `tidex.config.ts` at the package root (where you run Tidex commands).

## Full example

```ts
import { defineConfig } from "@tidex/core";

export default defineConfig({
  root: process.cwd(),
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**", "**/internal/**"],
    componentsDir: "src/components",
  },
  packageName: "@myorg/ui",
  defaults: {
    "forms/Checkbox": { label: "Accept terms", checked: true },
  },
  tokens: "tokens.json",
  preview: {
    wrapper: "src/preview/TidexWrapper.tsx",
    vite: {
      plugins: [],
    },
  },
  managerPort: 6006,
  previewPort: 6007,
  visual: { threshold: 0.1 },
  plugins: [],
});
```

## Options

### `scan.include`

Glob patterns for `.tsx` files to scan. Default: `["src/**/*.tsx"]`.

Run Tidex from the package that owns these files.

### `scan.exclude`

Additional globs excluded from discovery. Tidex always excludes `*.stories.*`, `*.test.*`, `*.spec.*`, and `*.d.ts`.

Default in `tidex init`: `["**/preview/**"]`.

### `scan.componentsDir`

Path segment used for sidebar grouping and stable component ids. Default: `"src/components"`.

Example: with `componentsDir: "src/ui"`, a file at `src/ui/forms/Checkbox.tsx` gets id `forms/Checkbox` and appears under **Forms** in the sidebar.

### `packageName`

npm package name shown in the Docs panel import example:

```ts
import { Button } from "@myorg/ui";
```

### `defaults`

Per-component default arg overrides, keyed by **component id** (e.g. `"forms/Checkbox"`):

```ts
defaults: {
  Button: { variant: "secondary", children: "Click me" },
  "overlays/Modal": { title: "Confirm action" },
},
```

### `tokens`

Path to a JSON token file, copied to `.tidex/tokens.json` on generate. Shown under **Foundations → Tokens**.

### `preview.wrapper`

Module path (relative to project root) whose **default export** is a React component accepting `{ children }`. Every story renders inside it.

### `preview.vite`

Extra Vite config merged into preview, visual, and test servers. Use for Tailwind, vanilla-extract, SVGR, etc.

### `visual.threshold`

Pixel diff threshold for visual regression (0–1). Default: `0.1`.

### `managerPort` / `previewPort`

Dev server ports. Defaults: `6006` / `6007`.

## Generated artifacts

| File                          | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `.tidex/manifest.json`        | Discovered components (with stable `id`)               |
| `.tidex/props.json`           | Extracted prop schemas, keyed by id                    |
| `.tidex/stories.generated.ts` | Lazy story modules                                     |
| `.tidex/config.json`          | Snapshot of `packageName`, `defaults`, `componentsDir` |
| `.tidex/scan-report.json`     | Warnings and diagnostics                               |
| `.tidex/tokens.json`          | Copy of your tokens file                               |

## CLI

```bash
tidex init                  # scaffold config + folders
tidex generate              # scan and write artifacts
tidex generate --verbose    # print diagnostics
tidex doctor                # validate setup
tidex dev                   # start manager + preview
```
