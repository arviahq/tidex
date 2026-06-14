import type { PointerEvent } from "react";
import "./resize.css";

interface PanelSplitterProps {
  size: number;
  isResizing: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
}

export function PanelSplitter({
  size,
  isResizing,
  onPointerDown,
  onDoubleClick,
}: PanelSplitterProps) {
  return (
    <div
      className="bb-splitter bb-splitter--panel"
      data-resizing={isResizing ? "true" : undefined}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize controls panel"
      aria-valuenow={size}
      aria-valuemin={160}
      title="Drag to resize · double-click to reset"
    >
      <div className="bb-splitter__line" aria-hidden="true" />
      <div className="bb-splitter__handle" aria-hidden="true">
        {isResizing ? (
          <span className="bb-splitter__label">{Math.round(size)}px</span>
        ) : (
          <svg width="10" height="5" viewBox="0 0 20 10" fill="none">
            <path
              d="M4 3.5h12M4 6.5h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
