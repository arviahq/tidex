# Troubleshooting

## No components in the sidebar

**Run generate first**

```bash
tidex generate
tidex dev
```

**Check `scan.include`** — patterns are relative to the package root where `tidex.config.ts` lives. Default is `src/**/*.tsx`.

**Export shape** — the export must be PascalCase and return JSX. See [component authoring](./component-authoring.md).

**Excluded path** — preview shells and internal files should be in `scan.exclude`:

```ts
scan: {
  exclude: ["**/preview/**", "**/internal/**"];
}
```

Run `tidex doctor` or `tidex generate --verbose` for a scan report.

---

## "No controllable props detected"

Common causes:

1. **Props imported from npm** — e.g. extending Chakra/MUI types. Move a slim local `{Name}Props` into the component file or a local `types.ts` in the same package.
2. **No props type** — add `ButtonProps` or type the first parameter.
3. **Only skipped props** — `children`, `className`, `style` are intentionally excluded.

Check `.tidex/scan-report.json` for `componentsWithUnknownProps` and `componentsWithNoProps`.

---

## Duplicate component names

Tidex assigns stable ids from folder + name (`forms/Button` vs `composite/Button`). If you see a duplicate-name warning, ids are already disambiguated — no action required unless you want to rename for clarity.

---

## Preview is blank or throws provider errors

Wrap stories in a theme/provider:

```tsx
// src/preview/TidexWrapper.tsx
import { ThemeProvider } from "../theme";

export default function TidexWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
```

```ts
preview: {
  wrapper: "src/preview/TidexWrapper.tsx";
}
```

Exclude the wrapper from scanning: `exclude: ["**/preview/**"]`.

---

## Changes to config or tokens don't apply

Restart `tidex dev` if you're on an older version. Current `tidex dev` watches `tidex.config.ts`, `tokens.json`, and the preview wrapper and re-scans automatically.

---

## `scan.include matched no files`

You ran Tidex from the wrong directory, or `include` doesn't match your layout. Either:

- `cd` to the package with `tidex.config.ts`, or
- Update `scan.include` (e.g. `["packages/ui/src/**/*.tsx"]` if config is at repo root).

---

## Visual baselines missing or wrong path

Baselines live at `.tidex/baselines/{componentId}.png` — nested ids use subfolders (e.g. `.tidex/baselines/forms/Checkbox.png`).

Capture baselines from the manager **Visual** tab or:

```bash
tidex visual --update
```

---

## Playwright errors

Install browsers once per machine:

```bash
pnpm exec playwright install chromium
```

---

## Imported types partially work

Tidex resolves types **within the project** (relative imports). It does not type-check against `node_modules` — that kept scans fast on large design systems. For library-wrapped components, define a local props interface with the fields you want to control.

---

## Get a full health check

```bash
tidex doctor
tidex generate --verbose
```

Warnings also appear as a banner in the manager when you run `tidex dev`.
