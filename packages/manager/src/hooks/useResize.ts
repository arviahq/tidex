import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface UseResizeOptions {
  initial: number;
  min: number;
  max: number | (() => number);
  axis: "horizontal" | "vertical";
  storageKey?: string;
  bodyClass?: string;
}

export function useResize({ initial, min, max, axis, storageKey, bodyClass }: UseResizeOptions) {
  const [size, setSize] = useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = Number(localStorage.getItem(storageKey));
      const limit = typeof max === "function" ? max() : max;
      if (!Number.isNaN(stored) && stored >= min && stored <= limit) return stored;
    }
    return initial;
  });
  const [isResizing, setIsResizing] = useState(false);

  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);
  const pointerId = useRef<number | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const pendingSize = useRef<number | null>(null);

  const getMax = useCallback(() => (typeof max === "function" ? max() : max), [max]);

  const clamp = useCallback(
    (value: number) => Math.min(getMax(), Math.max(min, value)),
    [getMax, min],
  );

  const stopDragging = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsResizing(false);
    pointerId.current = null;
    handleRef.current = null;
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    if (pendingSize.current !== null) {
      setSize(pendingSize.current);
      pendingSize.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      dragging.current = true;
      setIsResizing(true);
      startPos.current = axis === "horizontal" ? event.clientX : event.clientY;
      startSize.current = size;
      pointerId.current = event.pointerId;
      handleRef.current = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [axis, size],
  );

  const reset = useCallback(() => {
    setSize(clamp(initial));
  }, [clamp, initial]);

  useEffect(() => {
    const scheduleSize = (next: number) => {
      pendingSize.current = next;
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (pendingSize.current !== null) {
          setSize(pendingSize.current);
          pendingSize.current = null;
        }
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const current = axis === "horizontal" ? event.clientX : event.clientY;
      const delta = current - startPos.current;
      const next = axis === "horizontal" ? startSize.current + delta : startSize.current - delta;
      scheduleSize(clamp(next));
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!dragging.current) return;
      if (pointerId.current !== null && event.pointerId !== pointerId.current) return;
      handleRef.current?.releasePointerCapture(event.pointerId);
      stopDragging();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [axis, clamp, stopDragging]);

  useEffect(() => {
    if (!bodyClass) return;
    document.body.classList.toggle(bodyClass, isResizing);
    return () => document.body.classList.remove(bodyClass);
  }, [bodyClass, isResizing]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(size));
    }
  }, [size, storageKey]);

  return { size, onPointerDown, isResizing, reset };
}
