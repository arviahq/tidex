# Configuration reference

All options live in `tide.config.ts` at the package root (where you run Tide commands).

## Full example

```ts
import { defineConfig } from "@tide/core";

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
    wrapper: "src/preview/TideWrapper.tsx",
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

Run Tide from the package that owns these files.

### `scan.exclude`

Additional globs excluded from discovery. Tide always excludes `*.stories.*`, `*.test.*`, `*.spec.*`, and `*.d.ts`.

Default in `tide init`: `["**/preview/**"]`.

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

Path to a JSON token file, copied to `.tide/tokens.json` on generate. Shown under **Foundations → Tokens**.

### `preview.wrapper`

Module path (relative to project root) whose **default export** is a React component accepting `{ children }`. Every story renders inside it.

### `preview.vite`

Extra Vite config merged into preview, visual, and test servers. Use for Tailwind, vanilla-extract, SVGR, etc.

### `storybook`

Ingest an **existing Storybook**. When a project has a `.storybook/` config (or any
`*.stories.*` files), Tide reads each [Component Story Format
(CSF)](https://storybook.js.org/docs/api/csf) story and surfaces it in the sidebar alongside (or
instead of) convention-scanned components — no rewrites required.

Auto-detection is on by default, so the simplest config is none at all: run `tide dev` in a
Storybook repo and your stories appear, organized exactly like Storybook. Override only when you
need to:

```ts
storybook: {
  enabled: true,            // force on/off; unset = auto-detect
  configDir: ".storybook",  // Storybook config directory
  stories: ["src/**/*.stories.tsx"], // override globs (project-root-relative)
  scan: false,              // also run Tide's convention .tsx scan (default false)
  viteConfig: true,         // reuse the project's vite.config plugins (default true)
},
```

- **Discovery.** Story globs are read from `<configDir>/main.*` (falling back to
  `**/*.stories.@(tsx|ts|jsx|js)`). Each named story becomes its own entry, keyed
  `<meta.title>/<StoryName>` — e.g. a `Forms/Button` meta with a `Primary` story shows under
  **Forms › Button › Primary**.
- **Controls mirror Storybook.** When a story renders, the preview reads the _resolved_ argTypes
  and args from Storybook's `composeStory` and hydrates the Controls/Docs panels — so selects,
  computed `options`, required flags, and the real arg values match Storybook (not a static guess).
  The Docs/JSX snippet uses the underlying component's name, not the story export.
- **Stories only by default.** When a Storybook is detected, Tide shows **only** the stories, so
  the sidebar mirrors Storybook and you don't get a duplicate entry for every component that also
  has a story. Set `scan: true` to additionally surface convention-scanned `.tsx` components.
- **Full fidelity.** Stories render through Storybook's portable-stories
  [`composeStory`](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#composestory),
  so meta/story/global **decorators** and `.storybook/preview.*` **globals/parameters/providers**
  all apply. Both CSF2 (`Template.bind`) and CSF3 (`StoryObj`) are supported. Requires
  `@storybook/react` to be installed (it already is, in a Storybook repo).
- **Build pipeline.** Tide reuses your project's own `vite.config.*` plugins (vanilla-extract,
  svgr, etc.) in its preview/visual/test servers — the same way Storybook's `builder-vite` does —
  so components that need a custom transform just work. The React plugin and build-only plugins
  (e.g. `dts`) are filtered out. Set `viteConfig: false` to opt out, or add plugins explicitly via
  [`preview.vite`](#previewvite) (which always takes precedence).
- **Type-inferred controls.** Tide runs `react-docgen-typescript` in the preview (resolved from
  your project), so a prop typed as a union — `size: "sm" | "md" | "lg"` — becomes a select even
  when the story declares no argType for it, just like Storybook.
- **Limitations.** `play` functions are not auto-run (use Tide's Interactions/Tests panels);
  `*.mdx` docs files are skipped.

### `visual.threshold`

Pixel diff threshold for visual regression (0–1). Default: `0.1`.

### `managerPort` / `previewPort`

Dev server ports. Defaults: `6006` / `6007`.

## Generated artifacts

| File                         | Purpose                                                |
| ---------------------------- | ------------------------------------------------------ |
| `.tide/manifest.json`        | Discovered components (with stable `id`)               |
| `.tide/props.json`           | Extracted prop schemas, keyed by id                    |
| `.tide/stories.generated.ts` | Lazy story modules                                     |
| `.tide/config.json`          | Snapshot of `packageName`, `defaults`, `componentsDir` |
| `.tide/scan-report.json`     | Warnings and diagnostics                               |
| `.tide/tokens.json`          | Copy of your tokens file                               |

## CLI

```bash
tide init                  # scaffold config + folders
tide generate              # scan and write artifacts
tide generate --verbose    # print diagnostics
tide doctor                # validate setup
tide dev                   # start manager + preview
```
