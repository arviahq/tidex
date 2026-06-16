import React, {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { PREVIEW_MESSAGE, type StoryModule } from "@tide/runtime";
import { bindingsToCallbacks, type BindingsMap, type InteractionStep } from "@tide/core";
import { applyPreviewTheme, type PreviewTheme } from "./theme";
import { applyForcedStates, type ForcedStates } from "./forcePseudo";
import { isCompactMode } from "./isCompactMode";
import { runSteps } from "./runSteps";

/** Canvas view state driven by the manager's preview toolbar. */
interface PreviewView {
  zoom: number;
  force: ForcedStates;
  outline: boolean;
  grid: boolean;
}

const DEFAULT_VIEW: PreviewView = {
  zoom: 1,
  force: { hover: false, focus: false, active: false },
  outline: false,
  grid: false,
};
import {
  buildWiredArgs,
  useWiredArgs,
  type CallbackMap,
  type InteractionRecord,
} from "./wireCallbacks";

class PreviewErrorBoundary extends Component<
  { children: ReactNode; resetKey?: unknown },
  { error: Error | null; prevResetKey: unknown }
> {
  state = { error: null as Error | null, prevResetKey: undefined as unknown };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  // Clear a latched error when the render attempt changes (story switch, new
  // args, or a hot-reload of fixed code) so a transient failure recovers on its
  // own instead of sticking until a manual page refresh.
  static getDerivedStateFromProps(
    props: { resetKey?: unknown },
    state: { error: Error | null; prevResetKey: unknown },
  ) {
    if (props.resetKey !== state.prevResetKey) {
      return { error: null, prevResetKey: props.resetKey };
    }
    return null;
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bb-preview-boundary">
          <h3>Component Error</h3>
          <pre>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function loadStories(): Promise<Record<string, StoryModule>> {
  return import("virtual:tide-stories").then((mod) => mod.stories as Record<string, StoryModule>);
}

/**
 * Tide's inferred callback wiring for a story, read straight from
 * `.tide/bindings.json`. Lets a standalone preview (opened with `?bindings=1`,
 * e.g. by the headless interaction verifier) be interactive without the manager
 * — the manager itself always sends the merged wiring via SET_CALLBACKS instead.
 */
async function loadInferredCallbacks(storyId: string): Promise<CallbackMap> {
  try {
    const res = await fetch("/__tide/bindings.json");
    if (!res.ok) return {};
    const map = (await res.json()) as BindingsMap;
    return bindingsToCallbacks(map[storyId] ?? []) as CallbackMap;
  } catch {
    return {};
  }
}

type PreviewWrapper = ComponentType<{ children?: ReactNode }> | null;

function loadPreviewWrapper(): Promise<PreviewWrapper> {
  return import("virtual:tide-stories").then((mod) => mod.previewWrapper ?? null).catch(() => null);
}

// Wrap the rendered component in the user-configured provider/decorator (e.g. a
// ChakraProvider/theme wrapper) when one is set; otherwise render it bare.
function wrap(Wrapper: PreviewWrapper, child: ReactNode): ReactNode {
  return Wrapper ? <Wrapper>{child}</Wrapper> : child;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isEmbedded(): boolean {
  try {
    return window.parent !== window || window.frameElement !== null;
  } catch {
    return true;
  }
}

// The real content box of the canvas's container (the compact `#root`),
// measured live from the DOM — `clientWidth/Height` minus the element's own
// padding. This avoids hardcoding the iframe size or padding: it self-corrects
// to whatever the manager sizes the tile to. Because compact mode clips
// overflow (see preview.css), scrollbars never shrink this measurement.
function availableArea(el: HTMLElement): { w: number; h: number } | null {
  const container = el.parentElement;
  if (!container) return null;
  const style = getComputedStyle(container);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const w = container.clientWidth - padX;
  const h = container.clientHeight - padY;
  if (w <= 0 || h <= 0) return null;
  return { w, h };
}

// In compact mode (variant tiles), scale the rendered component to fit the
// tile without cropping. Each tile reports its natural content size to the
// manager, which replies (via SET_FIT_BOUNDS) with the largest natural size
// across all tiles of the component. Every tile then scales against those
// shared bounds, so all variants render at one common scale factor and their
// relative sizes are preserved. Until bounds arrive, the tile falls back to
// fitting its own content to avoid a flash of cropping.
//
// CSS transforms don't affect `offsetWidth/Height` or the box observed by
// `ResizeObserver`, so the measured size stays the unscaled intrinsic size.
function useScaleToFit(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  deps: unknown[],
): number {
  const [scale, setScale] = useState(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const boundsRef = useRef<{ w: number; h: number } | null>(null);

  const recompute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    const avail = availableArea(el);
    if (!avail) return;
    const bounds = boundsRef.current;
    const refW = bounds ? Math.max(bounds.w, w) : w;
    const refH = bounds ? Math.max(bounds.h, h) : h;
    // Shrink large components to fit, but never enlarge a small one — upscaling
    // turned tiny badges into giant blurry blobs in the variant gallery.
    setScale(Math.min(1, avail.w / refW, avail.h / refH));
  }, [ref]);

  // Measure natural size and report it to the manager.
  useLayoutEffect(() => {
    if (!enabled) {
      setScale(1);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w === 0 || h === 0) return;
      sizeRef.current = { w, h };
      window.parent.postMessage({ type: PREVIEW_MESSAGE.CONTENT_SIZE, payload: { w, h } }, "*");
      recompute();
    };

    measure();
    // Observe the canvas for content-size changes and the container for
    // available-area changes (e.g. the manager resizing the tile/iframe).
    const contentObserver = new ResizeObserver(measure);
    contentObserver.observe(el);
    const areaObserver = new ResizeObserver(recompute);
    if (el.parentElement) areaObserver.observe(el.parentElement);
    return () => {
      contentObserver.disconnect();
      areaObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, recompute, ...deps]);

  // Apply the shared fit bounds sent back by the manager.
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== PREVIEW_MESSAGE.SET_FIT_BOUNDS) return;
      const payload = event.data.payload;
      if (payload && typeof payload.w === "number" && typeof payload.h === "number") {
        boundsRef.current = { w: payload.w, h: payload.h };
        recompute();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [enabled, recompute]);

  return scale;
}

export function PreviewApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);
  const [story, setStory] = useState<StoryModule | null>(null);
  const [args, setArgs] = useState<Record<string, unknown>>({});
  const [callbacks, setCallbacks] = useState<CallbackMap>({});
  const [error, setError] = useState<string | null>(null);
  const [storyName, setStoryName] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [view, setView] = useState<PreviewView>(DEFAULT_VIEW);
  // Bumped by RELOAD to force a fresh unmount/remount of the current story.
  const [reloadNonce, setReloadNonce] = useState(0);
  const compact = isCompactMode();
  const scale = useScaleToFit(containerRef, compact, [story, args]);

  // Mirror the selected story id so the (stable) interaction reporter can tag
  // records without re-subscribing the wired handlers on every selection.
  const storyNameRef = useRef(storyName);
  storyNameRef.current = storyName;

  // Report each wired callback fire to the manager — drives the interaction log
  // and two-way controls sync (the manager applies the new controlled value).
  const reportInteraction = useCallback((record: InteractionRecord) => {
    window.parent.postMessage(
      { type: PREVIEW_MESSAGE.INTERACTION, payload: { ...record, storyId: storyNameRef.current } },
      "*",
    );
  }, []);

  // Args with explicit callback wiring applied; a mapped callback updates local
  // state here and re-renders the live preview.
  const wiredArgs = useWiredArgs(
    story ? { ...story.args, ...args } : args,
    callbacks,
    reportInteraction,
  );

  // True while a test run is driving the render, so the declarative
  // story/args effect below stands aside and doesn't fight over the root.
  const runningTestRef = useRef(false);

  // Bumped on every render attempt so the error boundary's resetKey changes and
  // a previously-latched error clears when fixed code/args re-render.
  const renderNonceRef = useRef(0);

  // Set once the manager has replied to our READY with a story (or test) so the
  // re-announce loop below can stop.
  const handshakeDoneRef = useRef(false);

  // The configured global wrapper (providers/theme), loaded once from the
  // generated module. `wrapperRef` mirrors it for the imperative test path.
  const [Wrapper, setWrapper] = useState<PreviewWrapper>(null);
  const wrapperRef = useRef<PreviewWrapper>(null);
  useEffect(() => {
    let cancelled = false;
    void loadPreviewWrapper().then((w) => {
      if (cancelled) return;
      wrapperRef.current = w;
      setWrapper(() => w);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Run an interaction test, fully self-contained: load + freshly mount the
  // requested story (clean state for re-runs), wait for it to settle, then
  // drive the steps and stream each result back. Works even on a just-mounted
  // iframe where no story has been selected yet (e.g. switching from Variants).
  const runTestRun = useCallback(
    async (
      name: string,
      steps: InteractionStep[],
      testArgs?: Record<string, unknown>,
      testCallbacks?: CallbackMap,
    ) => {
      const post = (type: string, payload: unknown) =>
        window.parent.postMessage({ type, payload }, "*");
      const fail = (message?: string) => {
        if (message) post(PREVIEW_MESSAGE.TEST_STEP, { index: -1, ok: false, message });
        post(PREVIEW_MESSAGE.TEST_DONE, { ok: false });
      };
      runningTestRef.current = true;
      try {
        const stories = await loadStories();
        const entry = stories[name];
        if (!entry) {
          fail(`Story "${name}" not found. Run \`tide generate\`.`);
          return;
        }
        // Surface the story so the canvas container mounts.
        setError(null);
        setWaiting(false);
        setStoryName(name);
        setStory(entry);
        // Wait for the container element to appear in the DOM.
        let container: HTMLDivElement | null = null;
        for (let i = 0; i < 60 && !container; i++) {
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
          container = containerRef.current;
        }
        if (!container) {
          fail("Preview canvas not ready.");
          return;
        }
        // Mount the component fresh for a clean run, with callback wiring so a
        // test driving clicks observes the same state updates as the preview.
        const mergedArgs = { ...entry.args, ...testArgs };
        const wired = buildWiredArgs(mergedArgs, testCallbacks);
        setArgs(mergedArgs);
        rootRef.current?.unmount();
        rootRef.current = createRoot(container);
        const mod = await entry.load();
        const Component = entry.isDefault
          ? (mod.default as React.ComponentType<Record<string, unknown>>)
          : (mod[entry.exportName] as React.ComponentType<Record<string, unknown>>);
        if (!Component) {
          throw new Error(`Could not resolve export "${entry.exportName}"`);
        }
        rootRef.current.render(
          <PreviewErrorBoundary resetKey={(renderNonceRef.current += 1)}>
            {wrap(wrapperRef.current, <Component {...wired} />)}
          </PreviewErrorBoundary>,
        );
        // Let React commit and effects settle before interacting.
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
        );
        const ok = await runSteps(container, steps, (result) =>
          post(PREVIEW_MESSAGE.TEST_STEP, result),
        );
        post(PREVIEW_MESSAGE.TEST_DONE, { ok });
      } catch (err) {
        fail(formatError(err));
      } finally {
        runningTestRef.current = false;
      }
    },
    [],
  );

  const selectStory = async (name: string, nextArgs?: Record<string, unknown>) => {
    try {
      const stories = await loadStories();
      const entry = stories[name];
      if (!entry) {
        setWaiting(false);
        setError(`Story "${name}" not found. Run \`tide generate\`.`);
        setStory(null);
        return;
      }
      setWaiting(false);
      setError(null);
      setStoryName(name);
      setStory(entry);
      setArgs(nextArgs !== undefined ? { ...entry.args, ...nextArgs } : entry.args);
    } catch (err) {
      setWaiting(false);
      setStory(null);
      setError(
        `Failed to load stories: ${formatError(err)}. Run \`tide generate\` from your project root.`,
      );
    }
  };

  // Register postMessage handler before anything else.
  useLayoutEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === PREVIEW_MESSAGE.UPDATE_ARGS) {
        setArgs(event.data.payload as Record<string, unknown>);
      }
      if (event.data?.type === PREVIEW_MESSAGE.SET_THEME) {
        const theme = event.data.payload as PreviewTheme;
        if (theme === "light" || theme === "dark") {
          applyPreviewTheme(theme);
        }
      }
      if (event.data?.type === PREVIEW_MESSAGE.SET_CALLBACKS) {
        setCallbacks((event.data.payload as CallbackMap) ?? {});
      }
      if (event.data?.type === PREVIEW_MESSAGE.SET_VIEW) {
        setView({ ...DEFAULT_VIEW, ...(event.data.payload as Partial<PreviewView>) });
      }
      if (event.data?.type === PREVIEW_MESSAGE.RELOAD) {
        rootRef.current?.unmount();
        rootRef.current = null;
        setReloadNonce((n) => n + 1);
      }
      if (event.data?.type === PREVIEW_MESSAGE.SELECT_STORY) {
        handshakeDoneRef.current = true;
        const payload = event.data.payload as
          | string
          | { story: string; args?: Record<string, unknown>; callbacks?: CallbackMap };
        if (typeof payload === "string") {
          setCallbacks({});
          void selectStory(payload);
        } else if (payload?.story) {
          setCallbacks(payload.callbacks ?? {});
          void selectStory(payload.story, payload.args);
        }
      }
      if (event.data?.type === PREVIEW_MESSAGE.RUN_TEST) {
        handshakeDoneRef.current = true;
        const payload = event.data.payload as {
          story: string;
          steps: InteractionStep[];
          args?: Record<string, unknown>;
          callbacks?: CallbackMap;
        };
        void runTestRun(payload.story, payload.steps ?? [], payload.args, payload.callbacks);
      }
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: PREVIEW_MESSAGE.READY }, "*");
    return () => window.removeEventListener("message", handler);
  }, [runTestRun]);

  // Load from URL when opened directly or in variant tiles.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("story");
    const argsParam = params.get("args");

    if (name) {
      let initialArgs: Record<string, unknown> | undefined;
      if (argsParam) {
        try {
          initialArgs = JSON.parse(argsParam) as Record<string, unknown>;
        } catch {
          setWaiting(false);
          setError("Invalid args query parameter.");
          return;
        }
      }
      void selectStory(name, initialArgs);
      // Self-wire Tide's inferred bindings so a directly-opened preview is
      // interactive (used by the headless interaction verifier).
      if (params.get("bindings") === "1") {
        void loadInferredCallbacks(name).then((cb) => setCallbacks(cb));
      }
      return;
    }

    if (!isEmbedded()) {
      const timeout = window.setTimeout(() => {
        setWaiting(false);
        setError(
          "No story selected. Open http://localhost:6006 for the manager, or add ?story=ComponentName to the URL.",
        );
      }, 2000);
      return () => window.clearTimeout(timeout);
    }

    // Embedded in manager — re-announce READY until the manager replies with a
    // story. A single dropped READY (sent before the manager's listener is
    // attached, or before its data has loaded) would otherwise dead-end into a
    // timeout; repeating it lets the handshake self-heal without a manual
    // refresh. The handler above stops the loop once a message arrives.
    const interval = window.setInterval(() => {
      if (handshakeDoneRef.current) {
        window.clearInterval(interval);
        return;
      }
      window.parent.postMessage({ type: PREVIEW_MESSAGE.READY }, "*");
    }, 400);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!story || !container) return;
    // A test run drives its own render; don't fight over the root.
    if (runningTestRef.current) return;

    if (!rootRef.current) {
      rootRef.current = createRoot(container);
    }

    let cancelled = false;

    void (async () => {
      try {
        const mod = await story.load();
        if (cancelled) return;

        const Component = story.isDefault
          ? (mod.default as React.ComponentType<Record<string, unknown>>)
          : (mod[story.exportName] as React.ComponentType<Record<string, unknown>>);

        if (!Component) {
          throw new Error(`Could not resolve export "${story.exportName}" from ${story.path}`);
        }

        rootRef.current?.render(
          <PreviewErrorBoundary resetKey={(renderNonceRef.current += 1)}>
            {wrap(Wrapper, <Component {...wiredArgs} />)}
          </PreviewErrorBoundary>,
        );
      } catch (err) {
        if (!cancelled) {
          setWaiting(false);
          setError(formatError(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [story, wiredArgs, Wrapper, reloadNonce]);

  useEffect(() => {
    return () => {
      rootRef.current?.unmount();
      rootRef.current = null;
    };
  }, []);

  // Element outlines + background grid are plain html classes (see preview.css).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("tide-outline", view.outline);
    root.classList.toggle("tide-grid", view.grid);
  }, [view.outline, view.grid]);

  // Re-pin forced pseudo-states after each (re)mount, since a freshly loaded
  // component may have injected new stylesheets to clone rules from.
  useEffect(() => {
    applyForcedStates(view.force);
  }, [view.force, story, wiredArgs, reloadNonce]);

  if (error) {
    return (
      <div className="bb-preview-error">
        <strong>Preview error</strong>
        <p>{error}</p>
        {storyName && <p data-muted="true">Story: {storyName}</p>}
      </div>
    );
  }

  if (!story || waiting) {
    return <div className="bb-preview-loading">Loading preview...</div>;
  }

  // Compact (variant) tiles scale-to-fit; the full preview applies the toolbar
  // zoom. The two never combine — zoom is a no-op in compact mode.
  const transform = compact
    ? scale !== 1
      ? `scale(${scale})`
      : undefined
    : view.zoom !== 1
      ? `scale(${view.zoom})`
      : undefined;

  return (
    <div
      ref={containerRef}
      className={compact ? "bb-preview-canvas" : undefined}
      data-tide-visual=""
      style={transform ? { transform } : undefined}
    />
  );
}
