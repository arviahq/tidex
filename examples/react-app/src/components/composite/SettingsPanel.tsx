import { ui } from "../../ui/theme";

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  frequency: "daily" | "weekly" | "never";
}

export interface PrivacySettings {
  profileVisible: boolean;
  searchable: boolean;
}

export interface SettingsPanelProps {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  /** Notification preferences (nested). */
  notifications: NotificationSettings;
  /** Privacy preferences (nested). */
  privacy: PrivacySettings;
}

function Row({ label, value }: { label: string; value: string | boolean }) {
  const on = value === true;
  const isBool = typeof value === "boolean";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 0",
        borderBottom: `1px solid ${ui.colors.border}`,
      }}
    >
      <span style={{ fontSize: 13, color: ui.colors.text }}>{label}</span>
      {isBool ? (
        <span
          style={{
            width: 34,
            height: 20,
            borderRadius: 999,
            background: on ? ui.colors.primary : ui.colors.borderStrong,
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: on ? 16 : 2,
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#fff",
              transition: "left 120ms",
            }}
          />
        </span>
      ) : (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: ui.colors.textMuted,
            textTransform: "capitalize",
          }}
        >
          {String(value)}
        </span>
      )}
    </div>
  );
}

export function SettingsPanel({ theme, density, notifications, privacy }: SettingsPanelProps) {
  const n = notifications ?? { email: false, push: false, frequency: "daily" };
  const p = privacy ?? { profileVisible: false, searchable: false };
  return (
    <div
      style={{
        width: 320,
        padding: 18,
        background: ui.colors.bg,
        border: `1px solid ${ui.colors.border}`,
        borderRadius: ui.radius.md,
        boxShadow: ui.shadow.sm,
        fontFamily: ui.font,
      }}
    >
      <SectionTitle>Appearance</SectionTitle>
      <Row label="Theme" value={theme} />
      <Row label="Density" value={density} />
      <SectionTitle>Notifications</SectionTitle>
      <Row label="Email" value={n.email} />
      <Row label="Push" value={n.push} />
      <Row label="Frequency" value={n.frequency} />
      <SectionTitle>Privacy</SectionTitle>
      <Row label="Profile visible" value={p.profileVisible} />
      <Row label="Searchable" value={p.searchable} />
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      style={{
        marginTop: 14,
        marginBottom: 2,
        fontSize: 11,
        fontWeight: 700,
        color: ui.colors.textSoft,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </div>
  );
}
