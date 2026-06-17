---
"@tidex/scanner": patch
---

Resolve more prop types so variant controls reliably surface.

Components whose only controllable prop was a variant imported from a generated
`.d.ts` showed an empty Props tab. The type resolver now handles the standard
TypeScript patterns those props use:

- **Aliased imports** — `import { type Foo as Bar }` is now resolved in the
  target module by the imported name (`Foo`), not the local alias (`Bar`).
- **`rootDirs`-mirrored declarations** — when an import resolves to a non-TS
  source (e.g. a generated `.graphql`/`.proto`/DSL file), the resolver follows
  tsconfig `rootDirs` to its generated declaration in the parallel directory.
- **More utility types** — `Partial`, `Required`, `Readonly`, and `NonNullable`
  unwrap to their source type (joining the existing `Omit`).
- **Indexed access** — `T["key"]` resolves to the member's type when `T` is
  project-local (e.g. `NonNullable<Props["side"]>` → its union), falling back to
  a string control for unresolvable lib types like `CSSProperties["borderRadius"]`.
- **Primitive unions** — `number | string` (ignoring `undefined`/`null`)
  collapses to the widest control instead of `unknown`.
- **Bounded `node_modules` resolution** — types imported from packages now
  resolve too, so a small imported union/enum becomes a control. Large external
  objects (`HTMLAttributes`, `CSSProperties`, …) are capped: anything over ~25
  members stays `unknown` rather than flooding the Props tab, and the TS lib
  globals (`lib.dom`) are skipped. The cap short-circuits before walking the big
  declarations, so there's no parse-time cost.
