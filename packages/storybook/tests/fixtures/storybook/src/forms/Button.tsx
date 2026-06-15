export type ButtonProps = {
  variant: "primary" | "secondary" | "ghost";
  size: "sm" | "md" | "lg";
  label: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({ label, disabled, onClick }: ButtonProps) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
