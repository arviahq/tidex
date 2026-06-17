# @tidex/scanner

## 0.0.5

### Patch Changes

- e5d065d: Resolve more prop types so variant controls reliably surface.

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
  - @tidex/core@0.0.5

## 0.0.4

### Patch Changes

- b252622: Discover compound components exported via `Object.assign(Root, { Sub })`.

  The scanner only unwrapped `forwardRef`/`memo` initializers, so idiomatic
  compound components (`export const Tabs = Object.assign(TabsRoot, { List, Tab })`)
  were silently skipped and never got a story. `unwrapComponentInit` now also sees
  through `Object.assign(...)` and resolves bare identifier roots (e.g. `TabsRoot`)
  to their local `const`/`function` declaration, so both `forwardRef`-based and
  plain function-declaration roots are detected. Identifier resolution is cycle-guarded.

  - @tidex/core@0.0.4

## 0.0.3

### Patch Changes

- @tidex/core@0.0.3

## 0.0.2

### Patch Changes

- @tidex/core@0.0.2
