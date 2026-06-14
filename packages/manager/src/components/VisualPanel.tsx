import { useEffect, useState } from "react";
import { formatDisplayName } from "@tide/core";
import { CodeBlock } from "./CodeBlock";
import { IconButton } from "./IconButton";
import { StatusBadge } from "./StatusBadge";
import { Spinner } from "./Spinner";
import { RunIcon, CameraIcon } from "./panel-icons";
import { Tabs } from "./Tabs";
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

type ViewMode = "side" | "baseline" | "current" | "diff";

const CLI_COMMANDS = `tide visual           # compare against baselines
tide visual --update  # refresh baselines`;

function imageUrl(relativePath: string, version: number): string {
  const encoded = relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/__tide/${encoded}?v=${version}`;
}

export function VisualPanel({
  storyId,
  componentName,
  args: _args,
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
  const hasCurrent = Boolean(entry?.currentPath);
  const hasDiff = Boolean(entry?.changed && entry?.diffPath);

  const baselineUrl = imageUrl(`baselines/${storyId}.png`, imageVersion);
  const currentUrl = imageUrl(`reports/${storyId}-current.png`, imageVersion);
  const diffUrl = imageUrl(`reports/${storyId}-diff.png`, imageVersion);

  const [mode, setMode] = useState<ViewMode>("side");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // After each run, jump to the most useful view: the diff when something
  // changed, the side-by-side comparison otherwise.
  useEffect(() => {
    if (entry?.changed && entry?.diffPath) setMode("diff");
    else setMode((m) => (m === "diff" ? "side" : m));
    setDims(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageVersion]);

  const modes: { id: ViewMode; label: string }[] = [
    { id: "side", label: "Side by side" },
    { id: "baseline", label: "Baseline" },
    { id: "current", label: "Current" },
    { id: "diff", label: "Diff" },
  ];
  const activeMode: ViewMode = modes.some((m) => m.id === mode) ? mode : "side";

  const diffEmptyText = entry && !entry.changed ? "No differences" : "Run to compare";

  let status: { kind: "info" | "pass" | "fail" | "warn"; text: string } | null = null;
  if (running) status = { kind: "info", text: "Capturing…" };
  else if (error) status = { kind: "fail", text: error };
  else if (notice) status = { kind: "pass", text: notice };
  else if (!hasBaseline) status = { kind: "warn", text: "No baseline yet" };
  else if (entry?.changed) {
    status = {
      kind: "fail",
      text: entry.sizeMismatch ? "Size mismatch" : `${entry.pixelsChanged.toLocaleString()} px changed`,
    };
  } else if (entry && !entry.changed) status = { kind: "pass", text: "Matches baseline" };

  const totalPx = dims ? dims.w * dims.h : 0;
  const pctChanged =
    entry && !entry.sizeMismatch && entry.pixelsChanged > 0 && totalPx > 0
      ? (entry.pixelsChanged / totalPx) * 100
      : null;

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth) setDims({ w: img.naturalWidth, h: img.naturalHeight });
  };

  return (
    <div className="bb-visual">
      <header className="bb-visual__header">
        <div className="bb-visual__title-row">
          <div className="bb-visual__title-block">
            <h2 className="bb-visual__name">{formatDisplayName(componentName)}</h2>
            <p className="bb-visual__subtitle">
              Pixel baseline · .tide/baselines/{storyId}.png · {theme} theme
            </p>
          </div>
          <div className="bb-visual__actions">
            <IconButton
              label={running ? "Capturing…" : "Run visual comparison"}
              variant="primary"
              onClick={onRun}
              disabled={running}
            >
              {running ? <Spinner /> : <RunIcon />}
            </IconButton>
            <IconButton label="Update baseline to current" onClick={onUpdateBaseline} disabled={running}>
              <CameraIcon />
            </IconButton>
            {status && (
              <StatusBadge kind={status.kind} wrap>
                {status.text}
              </StatusBadge>
            )}
          </div>
        </div>
      </header>

      <section className="bb-visual__section">
        <div className="bb-visual__toolbar">
          <Tabs items={modes} value={activeMode} onChange={setMode} ariaLabel="Comparison view" />
          <span className="bb-visual__meta">
            {dims ? `${dims.w}×${dims.h}px` : "—"}
            {pctChanged !== null && (
              <>
                <span className="bb-visual__meta-sep">·</span>
                <span className="bb-visual__meta-diff">{pctChanged.toFixed(2)}% changed</span>
              </>
            )}
          </span>
        </div>

        {!hasBaseline && (
          <p className="bb-visual__hint">
            No baseline yet — set props in the Preview tab, then use the{" "}
            <strong>camera button</strong> to capture the current render as the baseline.
          </p>
        )}

        <div className="bb-visual__stage" data-mode={activeMode}>
          {activeMode === "side" ? (
            <div className="bb-visual__pair">
              <VisualCanvas
                label="Baseline"
                src={hasBaseline ? baselineUrl : null}
                alt={`${componentName} baseline`}
                emptyText="No baseline yet"
                onLoad={onImgLoad}
              />
              <VisualCanvas
                label="Current"
                src={hasCurrent ? currentUrl : null}
                alt={`${componentName} current capture`}
                emptyText="Run to capture the current render"
              />
            </div>
          ) : activeMode === "baseline" ? (
            <VisualCanvas
              label="Baseline"
              solo
              src={hasBaseline ? baselineUrl : null}
              alt={`${componentName} baseline`}
              emptyText="No baseline yet"
              onLoad={onImgLoad}
            />
          ) : activeMode === "current" ? (
            <VisualCanvas
              label="Current"
              solo
              src={hasCurrent ? currentUrl : null}
              alt={`${componentName} current capture`}
              emptyText="Run to capture the current render"
            />
          ) : (
            <VisualCanvas
              label="Diff"
              solo
              src={hasDiff ? diffUrl : null}
              alt={`${componentName} diff`}
              emptyText={diffEmptyText}
            />
          )}
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

function VisualCanvas({
  label,
  src,
  alt,
  emptyText,
  solo,
  onLoad,
}: {
  label: string;
  src: string | null;
  alt: string;
  emptyText: string;
  solo?: boolean;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  // A missing/regenerating PNG should show a message, not a broken image.
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setErrored(false);
  }, [src]);

  return (
    <figure className="bb-visual__frame">
      <figcaption className="bb-visual__frame-label">{label}</figcaption>
      {src && !errored ? (
        <a
          className="bb-visual__canvas"
          data-solo={solo ? "true" : undefined}
          href={src}
          target="_blank"
          rel="noreferrer"
          title="Open full size"
        >
          <img
            className={solo ? "bb-visual__img bb-visual__img--solo" : "bb-visual__img"}
            src={src}
            alt={alt}
            onLoad={onLoad}
            onError={() => setErrored(true)}
          />
        </a>
      ) : (
        <div className="bb-visual__canvas bb-visual__canvas--empty" data-solo={solo ? "true" : undefined}>
          {errored ? "Image unavailable — run again to regenerate" : emptyText}
        </div>
      )}
    </figure>
  );
}
