# @tidex/scanner

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
