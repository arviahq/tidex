import { ui } from "../../ui/theme";

export interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  status: "done" | "active" | "pending";
}

export interface TimelineProps {
  events: TimelineEvent[];
  compact: boolean;
}

const DOT = {
  done: ui.colors.success,
  active: ui.colors.primary,
  pending: ui.colors.borderStrong,
} as const;

export function Timeline({ events, compact }: TimelineProps) {
  const list = Array.isArray(events) ? events : [];
  return (
    <div style={{ width: 360, fontFamily: ui.font, padding: 16 }}>
      {list.map((event, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: DOT[event.status] ?? ui.colors.borderStrong,
                border: `2px solid ${ui.colors.bg}`,
                boxShadow: `0 0 0 2px ${DOT[event.status] ?? ui.colors.border}`,
              }}
            />
            {i < list.length - 1 ? (
              <span style={{ flex: 1, width: 2, background: ui.colors.border, margin: "4px 0" }} />
            ) : null}
          </div>
          <div style={{ paddingBottom: compact ? 12 : 20 }}>
            <div style={{ fontSize: 11, color: ui.colors.textSoft, fontWeight: 600 }}>
              {event.time}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: ui.colors.text }}>
              {event.title}
            </div>
            {!compact && event.description ? (
              <div
                style={{ marginTop: 2, fontSize: 13, color: ui.colors.textMuted, lineHeight: 1.5 }}
              >
                {event.description}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
