import { ui } from "../ui/theme";

export type BadgeProps = {
  tone: "info" | "success" | "warning";
  outlined?: boolean;
  children?: React.ReactNode;
};

const tones = {
  info: { bg: ui.colors.info, soft: ui.colors.infoSoft, text: ui.colors.info },
  success: { bg: ui.colors.success, soft: ui.colors.successSoft, text: ui.colors.success },
  warning: { bg: ui.colors.warning, soft: ui.colors.warningSoft, text: ui.colors.warning },
};

export function Badge({ tone, outlined, children }: BadgeProps) {
  const palette = tones[tone] ?? tones.info;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: ui.radius.full,
        fontFamily: ui.font,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.01em",
        background: outlined ? palette.soft : palette.bg,
        color: outlined ? palette.text : "#fff",
        border: outlined ? `1px solid color-mix(in srgb, ${palette.text} 25%, ${ui.colors.border})` : "none",
      }}
    >
      {children ?? tone}
    </span>
  );
}
