import { useEffect, useMemo, useRef } from "react";
import { formatDisplayName } from "@tide/core";
import { buildVisualPreviewUrl, PREVIEW_MESSAGE, postToPreview } from "../api";
import { CodeBlock } from "./CodeBlock";
import "./visual.css";

export interface VisualPanelEntry {
  changed: boolean;
  pixelsChanged: number;
  diffPath?: string;
  currentPath?: string;
  sizeMismatch?: boolean;
}

interface VisualPanelProps {
  storyId: string;
  componentName: string;
  args: Record<string, unknown>;
  theme: "light" | "dark";
  hasBaseline: boolean;
  entry: VisualPanelEntry | null;
  running: boolean;
  error: string | null;
  notice: string | null;
  onRun: () => void;
  onUpdateBaseline: () => void;
  imageVersion: number;
}

const CLI_COMMANDS = `tide visual           # compare against baselines
tide visual --update  # refresh baselines`;

function imageUrl(relativePath: string, version: number): string {
  const encoded = relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/__tide/${encoded}?v=${version}`;
}

function LiveCurrentPreview({
  storyId,
  componentName,
  args,
  theme,
}: {
  storyId: string;
  componentName: string;
  args: Record<string, unknown>;
  theme: "light" | "dark";
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  const iframeSrc = useMemo(
    () => buildVisualPreviewUrl(storyId, args, theme),
    [storyId, args, theme],
  );

  useEffect(() => {
    readyRef.current = false;
  }, [storyId, iframeSrc]);

  useEffect(() => {
    if (!readyRef.current) return;
    postToPreview(iframeRef.current, {
      type: PREVIEW_MESSAGE.UPDATE_ARGS,
      payload: args,
    });
  }, [args]);

  useEffect(() => {
    if (!readyRef.current) return;
    postToPreview(iframeRef.current, {
      type: PREVIEW_MESSAGE.SET_THEME,
      payload: theme,
    });
  }, [theme]);

  return (
    <div className="bb-visual__frame-slot bb-visual__frame-slot--live">
      <iframe
        ref={iframeRef}
        key={storyId}
        className="bb-visual__live-frame"
        src={iframeSrc}
        title={`${componentName} live preview`}
        onLoad={() => {
          readyRef.current = true;
          postToPreview(iframeRef.current, {
            type: PREVIEW_MESSAGE.UPDATE_ARGS,
            payload: args,
          });
          postToPreview(iframeRef.current, {
            type: PREVIEW_MESSAGE.SET_THEME,
            payload: theme,
          });
        }}
      />
    </div>
  );
}

export function VisualPanel({
  storyId,
  componentName,
  args,
  theme,
  hasBaseline,
  entry,
  running,
  error,
  notice,
  onRun,
  onUpdateBaseline,
  imageVersion,
}: VisualPanelProps) {
  const baselinePath = `baselines/${storyId}.png`;
  const diffPath = `reports/${storyId}-diff.png`;

  let status: { kind: "info" | "pass" | "fail" | "warn"; text: string } | null = null;
  if (running) status = { kind: "info", text: "Capturing…" };
  else if (error) status = { kind: "fail", text: error };
  else if (notice) status = { kind: "pass", text: notice };
  else if (!hasBaseline) status = { kind: "warn", text: "No baseline yet" };
  else if (entry?.changed) {
    status = {
      kind: "fail",
      text: entry.sizeMismatch ? "Size mismatch" : `${entry.pixelsChanged} pixels changed`,
    };
  } else if (entry && !entry.changed) status = { kind: "pass", text: "Matches baseline" };

  const showDiff = entry?.changed && entry.diffPath;

  return (
    <div className="bb-visual">
      <header className="bb-visual__header">
        <div className="bb-visual__title-row">
          <div className="bb-visual__title-block">
            <h2 className="bb-visual__name">{formatDisplayName(componentName)}</h2>
            <p className="bb-visual__subtitle">
              Visual baseline · .tide/baselines/{storyId}.png · {theme} theme
            </p>
          </div>
          <div className="bb-visual__actions">
            <button
              type="button"
              className="bb-visual__btn bb-visual__btn--primary"
              onClick={onRun}
              disabled={running}
            >
              {running ? "Running…" : "Run visual"}
            </button>
            <button
              type="button"
              className="bb-visual__btn bb-visual__btn--secondary"
              onClick={onUpdateBaseline}
              disabled={running}
            >
              Update baseline
            </button>
            {status && (
              <span className="bb-visual__pill" data-kind={status.kind} role="status">
                {status.text}
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="bb-visual__section">
        <div className="bb-visual__section-head">
          <h3 className="bb-visual__section-title">Comparison</h3>
        </div>

        {!hasBaseline && (
          <p className="bb-visual__hint">
            No baseline yet — adjust props below, then click <strong>Update baseline</strong> to
            save what you see in Current.
          </p>
        )}

        <div className="bb-visual__grid">
          <figure className="bb-visual__frame">
            <figcaption className="bb-visual__frame-label">Baseline</figcaption>
            {hasBaseline ? (
              <a
                className="bb-visual__frame-slot"
                href={imageUrl(baselinePath, imageVersion)}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  className="bb-visual__img"
                  src={imageUrl(baselinePath, imageVersion)}
                  alt={`${componentName} baseline`}
                />
              </a>
            ) : (
              <div className="bb-visual__frame-slot bb-visual__frame-slot--empty">No baseline</div>
            )}
          </figure>

          <figure className="bb-visual__frame">
            <figcaption className="bb-visual__frame-label">Current · live</figcaption>
            <LiveCurrentPreview
              storyId={storyId}
              componentName={componentName}
              args={args}
              theme={theme}
            />
          </figure>

          <figure className="bb-visual__frame">
            <figcaption className="bb-visual__frame-label">Diff</figcaption>
            {showDiff ? (
              <a
                className="bb-visual__frame-slot"
                href={imageUrl(diffPath, imageVersion)}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  className="bb-visual__img"
                  src={imageUrl(diffPath, imageVersion)}
                  alt={`${componentName} diff`}
                />
              </a>
            ) : (
              <div className="bb-visual__frame-slot bb-visual__frame-slot--empty">
                {entry && !entry.changed ? "No differences" : "Run visual to compare"}
              </div>
            )}
          </figure>
        </div>
      </section>

      <section className="bb-visual__cli">
        <span className="bb-visual__cli-label">CLI</span>
        <p className="bb-visual__hint">Run headlessly in CI or locally (requires Playwright):</p>
        <CodeBlock code={CLI_COMMANDS} language="bash" />
      </section>
    </div>
  );
}
