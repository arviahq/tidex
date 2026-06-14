import { useEffect, useRef } from "react";
import { buildDefaultArgs, formatDisplayName } from "@tide/core";
import { computeVariants, formatVariantLabel } from "@tide/react";
import type { PropSchema } from "../api";
import { PREVIEW_URL, PREVIEW_MESSAGE } from "../api";
import type { Theme } from "../hooks/useTheme";
import "./variants.css";

interface VariantsPanelProps {
  storyId: string;
  componentName: string;
  props: Record<string, PropSchema>;
  baseArgs: Record<string, unknown>;
  theme: Theme;
}

export function VariantsPanel({
  storyId,
  componentName,
  props,
  baseArgs,
  theme,
}: VariantsPanelProps) {
  const variants = computeVariants(props, 12);

  const iframeRefs = useRef<Array<HTMLIFrameElement | null>>([]);
  const sizesRef = useRef<Map<number, { w: number; h: number }>>(new Map());

  useEffect(() => {
    sizesRef.current = new Map();
    iframeRefs.current = [];
  }, [storyId]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== PREVIEW_MESSAGE.CONTENT_SIZE) return;
      const index = iframeRefs.current.findIndex(
        (frame) => frame !== null && frame.contentWindow === event.source,
      );
      if (index === -1) return;
      const { w, h } = event.data.payload ?? {};
      if (typeof w !== "number" || typeof h !== "number") return;

      sizesRef.current.set(index, { w, h });
      let maxW = 0;
      let maxH = 0;
      for (const size of sizesRef.current.values()) {
        maxW = Math.max(maxW, size.w);
        maxH = Math.max(maxH, size.h);
      }
      const message = {
        type: PREVIEW_MESSAGE.SET_FIT_BOUNDS,
        payload: { w: maxW, h: maxH },
      };
      for (const frame of iframeRefs.current) {
        frame?.contentWindow?.postMessage(message, "*");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="bb-variants-viewport">
      <h3 className="bb-variants__heading">{formatDisplayName(componentName)} variants</h3>
      <div className="bb-variants">
        {variants.map((variantArgs, index) => {
          const args = { ...buildDefaultArgs(props), ...baseArgs, ...variantArgs };
          const params = new URLSearchParams({
            story: storyId,
            args: JSON.stringify(args),
            theme,
            compact: "1",
          });
          const src = `${PREVIEW_URL}?${params.toString()}`;
          const label = formatVariantLabel(variantArgs);

          return (
            <article key={label} className="bb-variants__tile">
              <header className="bb-variants__tile-head">
                <span className="bb-variants__tile-index">Variant {index + 1}</span>
                <div className="bb-variants__pills">
                  {Object.entries(variantArgs).map(([prop, value]) => (
                    <span
                      key={prop}
                      className="bb-variants__pill"
                      title={`${prop}: ${String(value)}`}
                    >
                      <span className="bb-variants__pill-key">{prop}</span>
                      <span aria-hidden="true">·</span>
                      {String(value)}
                    </span>
                  ))}
                </div>
              </header>
              <div className="bb-variants__stage">
                <iframe
                  ref={(el) => {
                    iframeRefs.current[index] = el;
                  }}
                  src={src}
                  title={label}
                  className="bb-variants__frame"
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
