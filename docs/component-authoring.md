# Component authoring

How to write components so Tide discovers them, extracts props, and builds controls.

## Stable component ids

Each component gets a stable **id** used for stories, tests, baselines, and saved wiring:

| File | Id |
| ---- | -- |
| `src/components/Button.tsx` | `Button` |
| `src/components/forms/Checkbox.tsx` | `forms/Checkbox` |

Ids are `{folderPath}/{ComponentName}` relative to `scan.componentsDir`. Two components named `Button` in different folders no longer collide.

## Supported export patterns

```tsx
// Named function
export function Button(props: ButtonProps) {
  return <button {...props} />;
}

// Arrow function
export const Card = (props: CardProps) => <div {...props} />;

// Default export
export default function Modal(props: ModalProps) {
  return <dialog open>{props.children}</dialog>;
}

// forwardRef / memo (inner function must contain JSX)
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return <input ref={ref} {...props} />;
});
```

## Opt out of discovery

Add `@tide-skip` in a JSDoc comment on the export:

```tsx
/** @tide-skip — internal layout shell, not a catalog component */
export function TideShell({ children }: { children: React.ReactNode }) {
  return <div className="shell">{children}</div>;
}
```

## Props naming

Tide looks for, in order:

1. `{ComponentName}Props` (e.g. `ButtonProps`)
2. `Props`
3. `I{ComponentName}Props`
4. The first parameter type on the component function

### Same-file props (best)

```tsx
export type ButtonProps = {
  variant: "primary" | "secondary";
  disabled?: boolean;
};

export function Button({ variant, disabled }: ButtonProps) {
  return <button data-variant={variant} disabled={disabled} />;
}
```

### Local shared types (supported)

Types imported from another file **in the same package** are resolved:

```tsx
// types/label.ts
export type LabelProps = { label: string };

// Checkbox.tsx
import type { LabelProps } from "../types/label";
export type CheckboxProps = LabelProps & { checked: boolean };
```

Types from `node_modules` stay `unknown` (no controls) by design — keeps scans fast.

### Intersections and extends

```tsx
export interface ButtonProps extends BaseProps {
  variant: "primary" | "secondary";
}

export type CheckboxProps = LabelProps & { checked: boolean };
```

Both patterns merge prop fields when types resolve locally.

## JSDoc descriptions

Prop descriptions from TSDoc appear in the Docs panel:

```tsx
export type AlertProps = {
  /** Severity controls color and icon */
  tone: "info" | "warning" | "error";
  message: string;
};
```

## Controls vs skipped props

| Prop | Behavior |
| ---- | -------- |
| `boolean`, `string`, `number` | Text/number/toggle control |
| `"a" \| "b"` union | Segmented control |
| `onClick`, `onChange`, etc. | Interactions tab (callback wiring) |
| `children`, `className`, `style`, `ref` | Skipped |
| Imported / unresolved types | `unknown` — no control |

## Default args

Tide generates sensible defaults (first union value, heuristic strings for `label`/`title`, etc.).

Override per component in config:

```ts
defaults: {
  "forms/Checkbox": { label: "Accept terms", checked: false },
},
```

See [configuration reference](./config-reference.md).
