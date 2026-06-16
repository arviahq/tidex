import { useRef, type ReactNode } from "react";
import type { PreviewViewportState } from "../hooks/usePreviewViewport";
import { useViewportResize } from "../hooks/useViewportResize";
import "./viewport.css";

interface PreviewViewportProps {
  viewport: PreviewViewportState;
  children: ReactNode;
}

export function PreviewViewport({ viewport, children }: PreviewViewportProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { isFixed, width, height, setSize } = viewport;

  const { onPointerDown } = useViewportResize({
    width,
    height,
    onResize: setSize,
    canvasRef,
  });

  if (!isFixed) {
    return <>{children}</>;
  }

  return (
    <div ref={canvasRef} className="bb-preview-canvas bb-preview-canvas--fixed">
      <div className="bb-preview-frame" style={{ width, height }}>
        {children}
        <div
          className="bb-preview-handle bb-preview-handle--e"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize width"
          onPointerDown={(event) => onPointerDown(event, "e")}
        />
        <div
          className="bb-preview-handle bb-preview-handle--s"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize height"
          onPointerDown={(event) => onPointerDown(event, "s")}
        />
        <div
          className="bb-preview-handle bb-preview-handle--se"
          role="separator"
          aria-label="Resize width and height"
          onPointerDown={(event) => onPointerDown(event, "se")}
        />
      </div>
    </div>
  );
}
