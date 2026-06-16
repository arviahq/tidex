import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { PreviewViewportState, ViewportPresetId } from "../hooks/usePreviewViewport";
import "./viewport.css";

const PRESETS: Array<{ id: ViewportPresetId; label: string; icon: () => ReactNode }> = [
  { id: "responsive", label: "Responsive", icon: ResponsiveIcon },
  { id: "mobile", label: "Mobile", icon: MobileIcon },
  { id: "tablet", label: "Tablet", icon: TabletIcon },
  { id: "desktop", label: "Desktop", icon: DesktopIcon },
  { id: "visual", label: "Visual", icon: VisualIcon },
];

interface IndicatorState {
  x: number;
  width: number;
  visible: boolean;
}

interface ViewportToolbarProps {
  viewport: PreviewViewportState;
}

export function ViewportToolbar({ viewport }: ViewportToolbarProps) {
  const { preset, displaySize, setPreset, isFixed } = viewport;
  const activePreset = preset === "custom" ? null : preset;
  const presetsRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<ViewportPresetId, HTMLButtonElement>>>({});
  const [indicator, setIndicator] = useState<IndicatorState>({ x: 0, width: 0, visible: false });

  const syncIndicator = useCallback(() => {
    if (!activePreset) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }
    const button = buttonRefs.current[activePreset];
    const container = presetsRef.current;
    if (!button || !container) return;
    setIndicator({
      x: button.offsetLeft,
      width: button.offsetWidth,
      visible: true,
    });
  }, [activePreset]);

  useLayoutEffect(() => {
    syncIndicator();
  }, [syncIndicator]);

  useEffect(() => {
    if (!activePreset) return;
    const container = presetsRef.current;
    if (!container) return;
    const observer = new ResizeObserver(syncIndicator);
    observer.observe(container);
    return () => observer.disconnect();
  }, [activePreset, syncIndicator]);

  return (
    <div className="bb-viewport-toolbar" role="toolbar" aria-label="Viewport size">
      <div
        ref={presetsRef}
        className="bb-viewport-toolbar__presets"
        role="group"
        aria-label="Viewport presets"
      >
        <span
          className="bb-viewport-toolbar__indicator"
          data-visible={indicator.visible ? "true" : undefined}
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.x}px)`,
          }}
          aria-hidden="true"
        />
        {PRESETS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            ref={(el) => {
              if (el) buttonRefs.current[id] = el;
              else delete buttonRefs.current[id];
            }}
            type="button"
            className="bb-viewport-toolbar__preset"
            data-active={activePreset === id ? "true" : undefined}
            aria-label={label}
            aria-pressed={activePreset === id}
            title={label}
            onClick={() => setPreset(id)}
          >
            <Icon />
          </button>
        ))}
      </div>
      <span className="bb-viewport-toolbar__size-slot" aria-hidden={!isFixed}>
        <span className="bb-viewport-toolbar__size" aria-live="polite">
          {isFixed && displaySize ? `${displaySize.width} × ${displaySize.height}` : null}
        </span>
        <span
          className="bb-viewport-toolbar__custom-label"
          data-visible={preset === "custom" ? "true" : undefined}
        >
          Custom
        </span>
      </span>
    </div>
  );
}

/* ── Icons (14×14 stroke) ─────────────────────────────────────────────── */
const S = { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none" } as const;
const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ResponsiveIcon() {
  return (
    <svg {...S}>
      <path d="M2 4.5h2.5V2M9.5 4.5H12V2M2 9.5h2.5V12M9.5 9.5H12V12" {...stroke} />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg {...S}>
      <rect x="4.5" y="1.5" width="5" height="11" rx="1" {...stroke} />
      <path d="M6.25 11h1.5" {...stroke} />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg {...S}>
      <rect x="3" y="2.5" width="8" height="9" rx="1" {...stroke} />
      <path d="M6 10.5h2" {...stroke} />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg {...S}>
      <rect x="2" y="2.5" width="10" height="6.5" rx="0.75" {...stroke} />
      <path d="M5.5 11.5h3M7 9v2.5" {...stroke} />
    </svg>
  );
}

function VisualIcon() {
  return (
    <svg {...S}>
      <rect x="2.5" y="3" width="9" height="7" rx="0.75" {...stroke} />
      <circle cx="7" cy="6.5" r="1.75" {...stroke} />
    </svg>
  );
}
