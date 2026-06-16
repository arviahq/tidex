import { useEffect, useRef, useState } from "react";
import "./preview-toolbar.css";

/** Forced CSS pseudo-states for the preview canvas. */
export interface ForcedStates {
  hover: boolean;
  focus: boolean;
  active: boolean;
}

/** Full canvas view state pushed to the preview via SET_VIEW. */
export interface PreviewView {
  zoom: number;
  force: ForcedStates;
  outline: boolean;
  grid: boolean;
}

export const DEFAULT_PREVIEW_VIEW: PreviewView = {
  zoom: 1,
  force: { hover: false, focus: false, active: false },
  outline: false,
  grid: false,
};

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function nextZoom(current: number, dir: -1 | 1): number {
  const idx = ZOOM_STEPS.findIndex((z) => z >= current - 0.001);
  const base = idx === -1 ? ZOOM_STEPS.length - 1 : idx;
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, base + dir))]!;
}

interface PreviewToolbarProps {
  view: PreviewView;
  onChange: (view: PreviewView) => void;
  onReload: () => void;
  onFullscreen: () => void;
  onOpenStandalone: () => void;
}

export function PreviewToolbar({
  view,
  onChange,
  onReload,
  onFullscreen,
  onOpenStandalone,
}: PreviewToolbarProps) {
  const forceActive = view.force.hover || view.force.focus || view.force.active;

  return (
    <div className="bb-ptoolbar" role="toolbar" aria-label="Preview controls">
      <div className="bb-ptoolbar__zoom">
        <button
          type="button"
          className="bb-ptoolbar__btn"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={view.zoom <= ZOOM_STEPS[0]!}
          onClick={() => onChange({ ...view, zoom: nextZoom(view.zoom, -1) })}
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          className="bb-ptoolbar__zoom-value"
          title="Reset zoom"
          onClick={() => onChange({ ...view, zoom: 1 })}
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <button
          type="button"
          className="bb-ptoolbar__btn"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={view.zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!}
          onClick={() => onChange({ ...view, zoom: nextZoom(view.zoom, 1) })}
        >
          <PlusIcon />
        </button>
      </div>

      <span className="bb-ptoolbar__sep" />

      <PseudoMenu
        force={view.force}
        active={forceActive}
        onChange={(force) => onChange({ ...view, force })}
      />

      <ToolbarToggle
        label="Outline elements"
        active={view.outline}
        onClick={() => onChange({ ...view, outline: !view.outline })}
      >
        <OutlineIcon />
      </ToolbarToggle>

      <ToolbarToggle
        label="Background grid"
        active={view.grid}
        onClick={() => onChange({ ...view, grid: !view.grid })}
      >
        <GridIcon />
      </ToolbarToggle>

      <span className="bb-ptoolbar__sep" />

      <button
        type="button"
        className="bb-ptoolbar__btn"
        aria-label="Reload story"
        title="Reload story"
        onClick={onReload}
      >
        <ReloadIcon />
      </button>
      <button
        type="button"
        className="bb-ptoolbar__btn"
        aria-label="Enter full screen"
        title="Enter full screen"
        onClick={onFullscreen}
      >
        <FullscreenIcon />
      </button>
      <button
        type="button"
        className="bb-ptoolbar__btn"
        aria-label="Open standalone"
        title="Open standalone (new tab)"
        onClick={onOpenStandalone}
      >
        <ExternalIcon />
      </button>
    </div>
  );
}

function ToolbarToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="bb-ptoolbar__btn"
      data-active={active ? "true" : undefined}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PseudoMenu({
  force,
  active,
  onChange,
}: {
  force: ForcedStates;
  active: boolean;
  onChange: (force: ForcedStates) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const states: Array<{ key: keyof ForcedStates; label: string }> = [
    { key: "hover", label: ":hover" },
    { key: "focus", label: ":focus" },
    { key: "active", label: ":active" },
  ];

  return (
    <div className="bb-ptoolbar__menu" ref={ref}>
      <button
        type="button"
        className="bb-ptoolbar__btn"
        data-active={active ? "true" : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Force pseudo-states"
        title="Force pseudo-states"
        onClick={() => setOpen((v) => !v)}
      >
        <PseudoIcon />
      </button>
      {open ? (
        <div className="bb-ptoolbar__popover" role="menu">
          {states.map(({ key, label }) => (
            <label key={key} className="bb-ptoolbar__check">
              <input
                type="checkbox"
                checked={force[key]}
                onChange={(e) => onChange({ ...force, [key]: e.target.checked })}
              />
              <code>{label}</code>
            </label>
          ))}
        </div>
      ) : null}
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

const MinusIcon = () => (
  <svg {...S}>
    <path d="M3 7h8" {...stroke} />
  </svg>
);
const PlusIcon = () => (
  <svg {...S}>
    <path d="M7 3v8M3 7h8" {...stroke} />
  </svg>
);
const ReloadIcon = () => (
  <svg {...S}>
    <path d="M11.5 7a4.5 4.5 0 1 1-1.32-3.18" {...stroke} />
    <path d="M10.5 1.5v2.5H8" {...stroke} />
  </svg>
);
const FullscreenIcon = () => (
  <svg {...S}>
    <path d="M2 5V2.5h2.5M9.5 2H12v2.5M12 9.5V12H9.5M4.5 12H2V9.5" {...stroke} />
  </svg>
);
const ExternalIcon = () => (
  <svg {...S}>
    <path d="M5.5 2.5H2.5V11.5H11.5V8.5" {...stroke} />
    <path d="M8 2.5h3.5V6M11.5 2.5L6.5 7.5" {...stroke} />
  </svg>
);
const OutlineIcon = () => (
  <svg {...S}>
    <rect
      x="2.25"
      y="2.25"
      width="9.5"
      height="9.5"
      rx="1.25"
      {...stroke}
      strokeDasharray="2 1.5"
    />
  </svg>
);
const GridIcon = () => (
  <svg {...S}>
    <path d="M2 5.5h10M2 8.5h10M5.5 2v10M8.5 2v10" {...stroke} />
  </svg>
);
const PseudoIcon = () => (
  <svg {...S}>
    <path d="M3 2.5l7 3-3 1-1 3-3-7Z" {...stroke} />
  </svg>
);
