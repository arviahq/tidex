import { ui } from "../../ui/theme";

export type SpinnerProps = {
  size: "sm" | "md" | "lg";
  /** Spin duration in seconds. @min(0.4) @max(3) @step(0.1) @slider */
  speed: number;
  /** Ring color. @color */
  color: string;
  label: string;
};

const PX = { sm: 18, md: 28, lg: 44 } as const;

export function Spinner({ size, speed, color, label }: SpinnerProps) {
  const dim = PX[size];
  const ring = color || ui.colors.primary;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: ui.font,
        padding: 16,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: dim,
          height: dim,
          borderRadius: "50%",
          border: `${Math.max(2, dim / 9)}px solid ${ui.colors.bgSubtle}`,
          borderTopColor: ring,
          animation: `tidex-spin ${Math.max(0.4, speed)}s linear infinite`,
        }}
      />
      {label ? <span style={{ fontSize: 13, color: ui.colors.textMuted }}>{label}</span> : null}
      <style>{`@keyframes tidex-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
