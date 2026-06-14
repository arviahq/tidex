export type ButtonProps = {
  variant: "primary" | "secondary";
  size: "sm" | "md" | "lg";
  disabled?: boolean;
};

export function Button({ variant, size, disabled }: ButtonProps) {
  return (
    <button data-variant={variant} data-size={size} disabled={disabled}>
      Button
    </button>
  );
}
