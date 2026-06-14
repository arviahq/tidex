import type { CSSProperties } from "react";
import { ui } from "../ui/theme";

export type ButtonProps = {
  variant: "primary" | "secondary" | "ghost";
  size: "sm" | "md" | "lg";
  disabled?: boolean;
  children?: React.ReactNode;
};

const sizes = {
  sm: { padding: "6px 12px", fontSize: 13 },
  md: { padding: "9px 16px", fontSize: 14 },
  lg: { padding: "12px 20px", fontSize: 15 },
};

export function Button({ variant, size, disabled, children }: ButtonProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: ui.font,
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: ui.radius.sm,
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
    ...sizes[size ?? "md"],
  };

  const variants: Record<ButtonProps["variant"], CSSProperties> = {
    primary: {
      background: ui.colors.primary,
      color: "#fff",
      boxShadow: "0 1px 2px rgba(79, 70, 229, 0.28)",
    },
    secondary: {
      background: ui.colors.bg,
      color: ui.colors.text,
      borderColor: ui.colors.border,
      boxShadow: ui.shadow.sm,
    },
    ghost: {
      background: "transparent",
      color: ui.colors.primary,
    },
  };

  return (
    <button type="button" style={{ ...base, ...(variants[variant] ?? variants.primary) }} disabled={disabled}>
      {children ?? "Button"}
    </button>
  );
}
