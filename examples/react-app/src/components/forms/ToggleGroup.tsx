import { ui } from "../../ui/theme";

export type ToggleGroupProps = {
  value: "day" | "week" | "month" | "year";
  size: "sm" | "md" | "lg";
  layout: "horizontal" | "vertical";
  fullWidth?: boolean;
};

const options = ["day", "week", "month", "year"] as const;

const paddings = {
  sm: "5px 10px",
  md: "7px 12px",
  lg: "9px 14px",
};

const fontSizes = { sm: 12, md: 13, lg: 14 };

export function ToggleGroup({ value, size, layout, fullWidth = false }: ToggleGroupProps) {
  return (
    <div
      role="group"
      aria-label="Time range"
      style={{
        display: "inline-flex",
        flexDirection: layout === "vertical" ? "column" : "row",
        gap: 4,
        padding: 4,
        borderRadius: ui.radius.md,
        border: `1px solid ${ui.colors.border}`,
        background: ui.colors.bgMuted,
        width: fullWidth ? "100%" : "auto",
        maxWidth: fullWidth ? 360 : undefined,
        fontFamily: ui.font,
        boxShadow: ui.shadow.sm,
      }}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            style={{
              flex: fullWidth && layout === "horizontal" ? 1 : undefined,
              padding: paddings[size],
              borderRadius: ui.radius.sm,
              border: active ? `1px solid ${ui.colors.border}` : "1px solid transparent",
              background: active ? ui.colors.bg : "transparent",
              color: active ? ui.colors.primary : ui.colors.textMuted,
              fontSize: fontSizes[size],
              fontWeight: active ? 600 : 500,
              textTransform: "capitalize",
              cursor: "pointer",
              boxShadow: active ? ui.shadow.sm : "none",
              transition: "background-color 150ms ease, color 150ms ease, box-shadow 150ms ease",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
