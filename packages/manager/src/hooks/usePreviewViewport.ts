import { useCallback, useMemo, useState } from "react";

export type ViewportPresetId =
  | "responsive"
  | "mobile"
  | "tablet"
  | "desktop"
  | "visual"
  | "custom";

export interface ViewportSize {
  width: number;
  height: number;
}

export const VIEWPORT_PRESET_SIZES: Record<
  Exclude<ViewportPresetId, "responsive" | "custom">,
  ViewportSize
> = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  visual: { width: 800, height: 600 },
};

const STORAGE_KEY = "tidex:preview-viewport";
const DEFAULT_CUSTOM_SIZE: ViewportSize = { width: 800, height: 600 };

const VALID_PRESETS = new Set<ViewportPresetId>([
  "responsive",
  "mobile",
  "tablet",
  "desktop",
  "visual",
  "custom",
]);

interface StoredViewport {
  preset: ViewportPresetId;
  width: number;
  height: number;
}

function readStored(): StoredViewport {
  if (typeof window === "undefined") {
    return { preset: "responsive", ...DEFAULT_CUSTOM_SIZE };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preset: "responsive", ...DEFAULT_CUSTOM_SIZE };
    const parsed = JSON.parse(raw) as Partial<StoredViewport>;
    const preset = VALID_PRESETS.has(parsed.preset as ViewportPresetId)
      ? (parsed.preset as ViewportPresetId)
      : "responsive";
    const width =
      typeof parsed.width === "number" && parsed.width >= 320
        ? parsed.width
        : DEFAULT_CUSTOM_SIZE.width;
    const height =
      typeof parsed.height === "number" && parsed.height >= 240
        ? parsed.height
        : DEFAULT_CUSTOM_SIZE.height;
    return { preset, width, height };
  } catch {
    return { preset: "responsive", ...DEFAULT_CUSTOM_SIZE };
  }
}

function writeStored(state: StoredViewport) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function usePreviewViewport() {
  const [state, setState] = useState(readStored);

  const isFixed = state.preset !== "responsive";

  const setPreset = useCallback((preset: ViewportPresetId) => {
    setState((prev) => {
      let next: StoredViewport;
      if (preset === "responsive") {
        next = { ...prev, preset };
      } else if (preset === "custom") {
        next = { ...prev, preset };
      } else {
        const size = VIEWPORT_PRESET_SIZES[preset];
        next = { preset, width: size.width, height: size.height };
      }
      writeStored(next);
      return next;
    });
  }, []);

  const setSize = useCallback((width: number, height: number) => {
    setState(() => {
      const next: StoredViewport = { preset: "custom", width, height };
      writeStored(next);
      return next;
    });
  }, []);

  const displaySize = useMemo(() => {
    if (!isFixed) return null;
    return { width: state.width, height: state.height };
  }, [isFixed, state.width, state.height]);

  return {
    preset: state.preset,
    width: state.width,
    height: state.height,
    isFixed,
    displaySize,
    setPreset,
    setSize,
  };
}

export type PreviewViewportState = ReturnType<typeof usePreviewViewport>;
