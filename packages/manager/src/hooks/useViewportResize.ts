import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const CANVAS_PADDING = 32;
const BODY_CLASS = "bb-is-resizing-viewport";

export type ViewportResizeHandle = "e" | "s" | "se";

interface UseViewportResizeOptions {
  width: number;
  height: number;
  onResize: (width: number, height: number) => void;
  canvasRef: RefObject<HTMLElement | null>;
}

export function useViewportResize({
  width,
  height,
  onResize,
  canvasRef,
}: UseViewportResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);
  const dragging = useRef(false);
  const activeHandle = useRef<ViewportResizeHandle | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startW = useRef(0);
  const startH = useRef(0);
  const pointerId = useRef<number | null>(null);
  const handleEl = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const pending = useRef<{ width: number; height: number } | null>(null);
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };

  const getMax = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return { maxW: 4096, maxH: 4096 };
    const pad = CANVAS_PADDING * 2;
    return {
      maxW: Math.max(MIN_WIDTH, el.clientWidth - pad),
      maxH: Math.max(MIN_HEIGHT, el.clientHeight - pad),
    };
  }, [canvasRef]);

  const clamp = useCallback(
    (w: number, h: number) => {
      const { maxW, maxH } = getMax();
      return {
        width: Math.min(maxW, Math.max(MIN_WIDTH, w)),
        height: Math.min(maxH, Math.max(MIN_HEIGHT, h)),
      };
    },
    [getMax],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, handle: ViewportResizeHandle) => {
      event.preventDefault();
      event.stopPropagation();
      dragging.current = true;
      setIsResizing(true);
      activeHandle.current = handle;
      startX.current = event.clientX;
      startY.current = event.clientY;
      startW.current = sizeRef.current.width;
      startH.current = sizeRef.current.height;
      pointerId.current = event.pointerId;
      handleEl.current = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.dataset.viewportAxis = handle;
    },
    [],
  );

  useEffect(() => {
    const schedule = (nextWidth: number, nextHeight: number) => {
      pending.current = { width: nextWidth, height: nextHeight };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (pending.current) {
          const { width: w, height: h } = pending.current;
          pending.current = null;
          onResize(w, h);
        }
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current || !activeHandle.current) return;
      const dx = event.clientX - startX.current;
      const dy = event.clientY - startY.current;
      const axis = activeHandle.current;
      let w = startW.current;
      let h = startH.current;
      if (axis === "e" || axis === "se") w = startW.current + dx;
      if (axis === "s" || axis === "se") h = startH.current + dy;
      const clamped = clamp(w, h);
      schedule(clamped.width, clamped.height);
    };

    const stop = (event: PointerEvent) => {
      if (!dragging.current) return;
      if (pointerId.current !== null && event.pointerId !== pointerId.current) return;
      handleEl.current?.releasePointerCapture(event.pointerId);
      dragging.current = false;
      setIsResizing(false);
      activeHandle.current = null;
      pointerId.current = null;
      handleEl.current = null;
      delete document.body.dataset.viewportAxis;
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
      if (pending.current) {
        const clamped = clamp(pending.current.width, pending.current.height);
        onResize(clamped.width, clamped.height);
        pending.current = null;
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [clamp, onResize]);

  useEffect(() => {
    document.body.classList.toggle(BODY_CLASS, isResizing);
    return () => {
      document.body.classList.remove(BODY_CLASS);
      delete document.body.dataset.viewportAxis;
    };
  }, [isResizing]);

  return { onPointerDown, isResizing };
}
