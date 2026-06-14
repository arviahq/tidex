import type { SharedLabelProps } from "./shared-props";

export type BadgeProps = SharedLabelProps & {
  tone: "neutral" | "danger";
};

export function Badge({ label, tone }: BadgeProps) {
  return <span data-tone={tone}>{label}</span>;
}
