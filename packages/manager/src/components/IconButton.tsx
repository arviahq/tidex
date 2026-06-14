import type { ReactNode } from "react";
import "./icon-button.css";

interface IconButtonProps {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
}

/** A compact, square icon-only button. `label` is used for both tooltip and a11y. */
export function IconButton({
  label,
  children,
  onClick,
  disabled,
  variant = "default",
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={variant === "primary" ? "bb-iconbtn bb-iconbtn--primary" : "bb-iconbtn"}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
