import type { PointerEvent } from "react";
import "./resize.css";

interface SidebarSplitterProps {
  isResizing: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}

export function SidebarSplitter({ isResizing, onPointerDown }: SidebarSplitterProps) {
  return (
    <div
      className="bb-splitter bb-splitter--sidebar"
      data-resizing={isResizing ? "true" : undefined}
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
    >
      <div className="bb-splitter__line" aria-hidden="true" />
      <div className="bb-splitter__handle" aria-hidden="true">
        <svg width="14" height="7" viewBox="0 0 20 10" fill="none">
          <path
            d="M4 3.5h12M4 6.5h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
