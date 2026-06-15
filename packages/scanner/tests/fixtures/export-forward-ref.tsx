import { forwardRef } from "react";

export type InputProps = {
  label: string;
  disabled?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, disabled },
  ref,
) {
  return (
    <label>
      {label}
      <input ref={ref} disabled={disabled} />
    </label>
  );
});
