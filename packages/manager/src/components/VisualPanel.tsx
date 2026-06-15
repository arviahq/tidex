import { useEffect, useState } from "react";
import { formatDisplayName } from "@tide/core";
import type { VisualDiffDetail, VisualDiffSummary, VisualLayerKey } from "../api";
import { CodeBlock } from "./CodeBlock";
import { IconButton } from "./IconButton";
import { StatusBadge, type StatusKind } from "./StatusBadge";
import { Spinner } from "./Spinner";
import { RunIcon, CameraIcon } from "./panel-icons";
import { Tabs } from "./Tabs";
import { A11yDiffView, DomDiffView, LayoutDiffView, StyleDiffView } from "./VisualDiffViews";
import "./visual.css";

export interface VisualPanelEntry {
  changed: boolean;
  pixelsChanged: number;
  diffPath?: string;
  currentPath?: string;
  sizeMismatch?: boolean;
  summary?: VisualDiffSummary;
}

interface VisualPanelProps {
  storyId: string;
  componentName: string;
  args: Record<string, unknown>;
  theme: "light" | "dark";
  hasBaseline: boolean;
  entry: VisualPanelEntry | null;
  diffDetail: VisualDiffDetail | null;
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

const LAYER_ORDER: VisualLayerKey[] = ["styles", "layout", "dom", "a11y"];

function imageUrl(relativePath: string, version: number): string {
  const encoded = relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/__tide/${encoded}?v=${version}`;
}

function layerKind(key: VisualLayerKey, summary: VisualDiffSummary): StatusKind {
  if (key === "screenshot" && summary.classification === "pixel-noise") return "warn";
  return summary.layers[key].changed ? "fail" : "pass";
}

export function VisualPanel({
  storyId,
  componentName,
  args: _args,
  theme,
  hasBaseline,
  entry,
  diffDetail,
  running,
  error,
  notice,
  onRun,
  onUpdateBaseline,
  imageVersion,
}: VisualPanelProps) {
  const hasCurrent = Boolean(entry?.currentPath);
  const hasDiffImage = Boolean(entry?.diffPath);
  const summary = entry?.summary;

  const baselineUrl = imageUrl(`baselines/${storyId}.png`, imageVersion);
  const currentUrl = imageUrl(`reports/${storyId}-current.png`, imageVersion);
  const diffUrl = imageUrl(`reports/${storyId}-diff.png`, imageVersion);

  const [layer, setLayer] = useState<VisualLayerKey>("screenshot");
  const [mode, setMode] = useState<ViewMode>("side");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // After each run, jump to the most useful view.
  useEffect(() => {
    const s = entry?.summary;
    if (s && s.classification === "semantic") {
      let best: VisualLayerKey = "screenshot";
      let bestN = 0;
      for (const k of LAYER_ORDER) {
        if (s.layers[k].changed && s.layers[k].count >= bestN) {
          best = k;
          bestN = s.layers[k].count;
        }
      }
      setLayer(best);
    } else {
      setLayer("screenshot");
    }
    setMode(entry?.diffPath ? "diff" : "side");
    setDims(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageVersion]);

  const layerTabs: { id: VisualLayerKey; label: string }[] = summary
    ? [
        { id: "screenshot", label: "Screenshot" },
        { id: "styles", label: countLabel("Styles", summary.layers.styles.count) },
        { id: "dom", label: countLabel("DOM", summary.layers.dom.count) },
        { id: "layout", label: countLabel("Layout", summary.layers.layout.count) },
        { id: "a11y", label: countLabel("A11y", summary.layers.a11y.count) },
      ]
    : [{ id: "screenshot", label: "Screenshot" }];
  const activeLayer: VisualLayerKey = layerTabs.some((t) => t.id === layer) ? layer : "screenshot";

  let status: { kind: StatusKind; text: string } | null = null;
  if (running) status = { kind: "info", text: "Capturing…" };
  else if (error) status = { kind: "fail", text: error };
  else if (notice) status = { kind: "pass", text: notice };
  else if (!hasBaseline) status = { kind: "warn", text: "No baseline yet" };
  else if (summary) {
    if (summary.classification === "pixel-noise")
      status = { kind: "warn", text: "Pixel diff only (no semantic change)" };
    else if (summary.classification === "semantic") status = { kind: "fail", text: "Changed" };
    else status = { kind: "pass", text: "Matches baseline" };
  } else if (entry?.changed) {
    status = {
      kind: "fail",
      text: entry.sizeMismatch
        ? "Size mismatch"
        : `${entry.pixelsChanged.toLocaleString()} px changed`,
    };
  } else if (entry && !entry.changed) status = { kind: "pass", text: "Matches baseline" };

  const modes: { id: ViewMode; label: string }[] = [
    { id: "side", label: "Side by side" },
    { id: "baseline", label: "Baseline" },
    { id: "current", label: "Current" },
    { id: "diff", label: "Diff" },
  ];
  const activeMode: ViewMode = modes.some((m) => m.id === mode) ? mode : "side";
  const diffEmptyText = entry && !entry.changed ? "No differences" : "Run to compare";

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
              Visual snapshot · .tide/baselines/{storyId} · {theme} theme
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
            <IconButton
              label="Update baseline to current"
              onClick={onUpdateBaseline}
              disabled={running}
            >
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

      {summary ? (
        <div className="bb-visual__verdict" data-kind={summary.classification}>
          <p className="bb-visual__verdict-text">{summary.verdict}</p>
          <div className="bb-visual__verdict-layers">
            {(["screenshot", ...LAYER_ORDER] as VisualLayerKey[]).map((k) => (
              <StatusBadge key={k} kind={layerKind(k, summary)}>
                {LAYER_LABELS[k]}
                {k !== "screenshot" && summary.layers[k].count > 0
                  ? ` ${summary.layers[k].count}`
                  : ""}
              </StatusBadge>
            ))}
          </div>
        </div>
      ) : hasBaseline && entry && !running && !error ? (
        <div className="bb-visual__verdict" data-kind="legacy">
          <p className="bb-visual__verdict-text">
            Pixel-only result — this baseline predates multi-layer snapshots, so only the screenshot
            can be compared. Use the <strong>camera button</strong> to update the baseline and
            unlock Styles, DOM, Layout &amp; A11y diffs.
          </p>
        </div>
      ) : null}

      <section className="bb-visual__section">
        <div className="bb-visual__toolbar">
          <Tabs items={layerTabs} value={activeLayer} onChange={setLayer} ariaLabel="Diff layer" />
        </div>

        {!hasBaseline && (
          <p className="bb-visual__hint">
            No baseline yet — set props in the Preview tab, then use the{" "}
            <strong>camera button</strong> to capture the current render as the baseline.
          </p>
        )}

        {activeLayer === "screenshot" ? (
          <>
            <div className="bb-visual__toolbar">
              <Tabs
                items={modes}
                value={activeMode}
                onChange={setMode}
                ariaLabel="Comparison view"
              />
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
                  src={hasDiffImage ? diffUrl : null}
                  alt={`${componentName} diff`}
                  emptyText={diffEmptyText}
                />
              )}
            </div>
          </>
        ) : (
          <div className="bb-visual__layer-body">
            {!diffDetail ? (
              <p className="bb-visual__hint">Run a comparison to inspect this layer.</p>
            ) : activeLayer === "styles" ? (
              <StyleDiffView diff={diffDetail.styles} />
            ) : activeLayer === "dom" ? (
              <DomDiffView diff={diffDetail.dom} />
            ) : activeLayer === "layout" ? (
              <LayoutDiffView diff={diffDetail.layout} />
            ) : (
              <A11yDiffView diff={diffDetail.a11y} />
            )}
          </div>
        )}
      </section>

      <section className="bb-visual__cli">
        <span className="bb-visual__cli-label">CLI</span>
        <p className="bb-visual__hint">Run headlessly in CI or locally (requires Playwright):</p>
        <CodeBlock code={CLI_COMMANDS} language="bash" />
      </section>
    </div>
  );
}

const LAYER_LABELS: Record<VisualLayerKey, string> = {
  screenshot: "Screenshot",
  styles: "Styles",
  dom: "DOM",
  layout: "Layout",
  a11y: "A11y",
};

function countLabel(base: string, count: number): string {
  return count > 0 ? `${base} ${count}` : base;
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
        <div
          className="bb-visual__canvas bb-visual__canvas--empty"
          data-solo={solo ? "true" : undefined}
        >
          {errored ? "Image unavailable — run again to regenerate" : emptyText}
        </div>
      )}
    </figure>
  );
}
