import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  bindingsToCallbacks,
  buildDefaultArgs,
  formatDisplayName,
  getComponentId,
} from "@tide/core";
import type {
  ComponentEntry,
  InteractionBinding,
  InteractionRecord,
  InteractionStep,
  InteractionTest,
  PropSchema,
  PropsMap,
  StepResult,
} from "@tide/core";
import { computeVariants, propToControl } from "@tide/react";
import { useTideData } from "./hooks";
import { useResize } from "./hooks/useResize";
import { usePreviewTheme } from "./hooks/usePreviewTheme";
import { ControlsPanel } from "./components/ControlsPanel";
import { VariantsPanel } from "./components/VariantsPanel";
import { DocsPanel } from "./components/DocsPanel";
import { TokensPanel } from "./components/TokensPanel";
import { TestsPanel } from "./components/TestsPanel";
import { VisualPanel, type VisualPanelEntry } from "./components/VisualPanel";
import { InteractionsPanel } from "./components/InteractionsPanel";
import { PanelSplitter } from "./components/PanelSplitter";
import { SidebarSplitter } from "./components/SidebarSplitter";
import { ThemeToggle } from "./components/ThemeToggle";
import { Tabs } from "./components/Tabs";
import { SidebarTree } from "./components/SidebarTree";
import { CommandPalette } from "./components/CommandPalette";
import { ScanDiagnostics } from "./components/ScanDiagnostics";
import {
  PREVIEW_URL,
  PREVIEW_MESSAGE,
  postToPreview,
  fetchTest,
  saveTest,
  fetchInteractions,
  saveInteractions,
  checkVisualBaseline,
  runVisualTest,
  updateVisualBaseline,
  fetchVisualReport,
  fetchVisualDiffDetail,
  type CallbackMap,
  type VisualDiffDetail,
} from "./api";
import "./components/layout.css";

type PanelTab = "props" | "docs" | "tests" | "visual" | "interactions";
type PreviewTab = "preview" | "variants";
type FoundationView = "tokens";

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "props", label: "Props" },
  { id: "docs", label: "Docs" },
  { id: "tests", label: "Tests" },
  { id: "visual", label: "Visual" },
  { id: "interactions", label: "Interactions" },
];

const FOUNDATION_ITEMS: { id: FoundationView; label: string; description: string }[] = [
  { id: "tokens", label: "Tokens", description: "Design tokens" },
];

const PREVIEW_TAB_PREVIEW = { id: "preview" as const, label: "Preview" };
const PREVIEW_TAB_VARIANTS = { id: "variants" as const, label: "Variants" };

const EMPTY_COMPONENTS: ComponentEntry[] = [];
const EMPTY_PROPS_MAP: PropsMap = {};
const EMPTY_COMPONENT_PROPS: Record<string, PropSchema> = {};
const EMPTY_BINDINGS: InteractionBinding[] = [];

/**
 * Inferred bindings → runtime wiring. High/medium confidence auto-wire; low is
 * left action-only. The result is overlaid with the user's saved wiring.
 */
function bindingsToCallbackMap(bindings: InteractionBinding[]): CallbackMap {
  // Delegate to the shared core helper so the manager and the preview's
  // standalone self-wiring never diverge.
  return bindingsToCallbacks(bindings) as CallbackMap;
}

function TideLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 5.75c1.3-1.6 2.6-1.6 3.9 0s2.6 1.6 3.9 0 2.6-1.6 3.9 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 10.25c1.3-1.6 2.6-1.6 3.9 0s2.6 1.6 3.9 0 2.6-1.6 3.9 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function App() {
  const queryClient = useQueryClient();
  const { manifest, props, tokens, config, scanReport, bindings } = useTideData();

  // The dev server regenerates artifacts and signals a data change instead of
  // full-reloading the manager (see packages/cli/src/dev.ts). Refetch in place
  // so the selected story, control values, and preview handshake survive an edit.
  useEffect(() => {
    if (!import.meta.hot) return;
    const refetch = () => {
      void queryClient.invalidateQueries();
    };
    import.meta.hot.on("tide:data-changed", refetch);
    return () => {
      import.meta.hot?.off("tide:data-changed", refetch);
    };
  }, [queryClient]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [foundationView, setFoundationView] = useState<FoundationView | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("props");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("preview");
  const [args, setArgs] = useState<Record<string, unknown>>({});
  // User-authored wiring (overrides inferred bindings); persisted to .tide/interactions.
  const [callbacks, setCallbacks] = useState<CallbackMap>({});
  // Live interaction records reported by the preview (most-recent first).
  const [interactionLog, setInteractionLog] = useState<InteractionRecord[]>([]);
  const [tests, setTests] = useState<Record<string, InteractionTest>>({});
  const [testResults, setTestResults] = useState<StepResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [visualRunning, setVisualRunning] = useState(false);
  const [visualEntry, setVisualEntry] = useState<VisualPanelEntry | null>(null);
  const [visualDiffDetail, setVisualDiffDetail] = useState<VisualDiffDetail | null>(null);
  const [visualHasBaseline, setVisualHasBaseline] = useState(false);
  const [visualImageVersion, setVisualImageVersion] = useState(0);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [visualNotice, setVisualNotice] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme: previewTheme, toggle: togglePreviewTheme } = usePreviewTheme();

  const sidebar = useResize({
    initial: 260,
    min: 220,
    max: 420,
    axis: "horizontal",
    storageKey: "tide:sidebar-width",
    bodyClass: "bb-is-resizing-sidebar",
  });

  const panel = useResize({
    initial: 320,
    min: 160,
    max: () => window.innerHeight * 0.78,
    axis: "vertical",
    storageKey: "tide:panel-height",
    bodyClass: "bb-is-resizing-panel",
  });

  const components = useMemo(
    () => manifest.data?.components ?? EMPTY_COMPONENTS,
    [manifest.data?.components],
  );
  const propsMap = useMemo(() => props.data ?? EMPTY_PROPS_MAP, [props.data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        getComponentId(c).toLowerCase().includes(q) ||
        formatDisplayName(c.name).toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q),
    );
  }, [components, search]);

  useEffect(() => {
    if (!selected && components.length > 0) {
      setSelected(getComponentId(components[0]!));
    }
  }, [components, selected]);

  // Toggle the command palette with ⌘K / Ctrl-K from anywhere.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const selectComponentById = useCallback(
    (id: string) => {
      const schema = propsMap[id];
      setFoundationView(null);
      setSelected(id);
      setArgs(schema ? buildDefaultArgs(schema) : {});
    },
    [propsMap],
  );

  const paletteComponents = useMemo(
    () =>
      components.map((c) => ({
        id: getComponentId(c),
        label: formatDisplayName(c.name),
        sublabel: c.path,
      })),
    [components],
  );

  const paletteFoundation = useMemo(
    () =>
      FOUNDATION_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        sublabel: item.description,
      })),
    [],
  );

  const selectedComponent = components.find((c) => getComponentId(c) === selected);
  const defaultOverrides = selected ? config.data?.defaults?.[selected] : undefined;
  const componentProps = useMemo(() => {
    if (!selected) return EMPTY_COMPONENT_PROPS;
    return propsMap[selected] ?? EMPTY_COMPONENT_PROPS;
  }, [selected, propsMap]);

  // A component with no controllable props (none, or all props skipped)
  // shouldn't show a Props tab at all.
  const hasControls = useMemo(
    () =>
      Object.entries(componentProps).some(([name, schema]) => propToControl(name, schema) !== null),
    [componentProps],
  );
  const panelTabs = useMemo(
    () => PANEL_TABS.filter((t) => t.id !== "props" || hasControls),
    [hasControls],
  );

  useEffect(() => {
    if (tab === "props" && !hasControls) {
      setTab(panelTabs[0]?.id ?? "docs");
    }
  }, [tab, hasControls, panelTabs]);

  const previewTabs = useMemo((): { id: PreviewTab; label: string }[] => {
    const tabs: { id: PreviewTab; label: string }[] = [PREVIEW_TAB_PREVIEW];
    if (computeVariants(componentProps, 12).length > 0) {
      tabs.push(PREVIEW_TAB_VARIANTS);
    }
    return tabs;
  }, [componentProps]);

  useEffect(() => {
    if (previewTab === "variants" && !previewTabs.some((tab) => tab.id === "variants")) {
      setPreviewTab("preview");
    }
  }, [previewTab, previewTabs]);

  // Reset args to defaults when the *selected component* changes. Only preserve
  // existing values once the user has actually edited a control — otherwise
  // re-running with late-arriving `defaultOverrides` (config loads after the
  // first render) must apply them, not keep the stale pre-override guess.
  const userEditedRef = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || !propsMap[selected]) return;
    const defaults = buildDefaultArgs(propsMap[selected]!, defaultOverrides);
    if (prevSelectedRef.current === selected && userEditedRef.current) {
      setArgs((prev) => {
        const merged: Record<string, unknown> = {};
        for (const key of Object.keys(defaults)) {
          merged[key] = key in prev ? prev[key] : defaults[key];
        }
        return merged;
      });
    } else {
      prevSelectedRef.current = selected;
      userEditedRef.current = false;
      setArgs(defaults);
    }
  }, [selected, propsMap, defaultOverrides]);

  const previewReadyRef = useRef(false);
  // Inferred bindings for the selected component, overlaid with the user's
  // saved wiring (user wins). This is what the preview is wired with.
  const selectedBindings = selected
    ? (bindings.data?.[selected] ?? EMPTY_BINDINGS)
    : EMPTY_BINDINGS;
  const effectiveCallbacks = useMemo(
    () => ({ ...bindingsToCallbackMap(selectedBindings), ...callbacks }),
    [selectedBindings, callbacks],
  );

  const argsRef = useRef(args);
  argsRef.current = args;
  const callbacksRef = useRef(effectiveCallbacks);
  callbacksRef.current = effectiveCallbacks;
  const pendingRunRef = useRef<{
    story: string;
    steps: InteractionStep[];
    args: Record<string, unknown>;
    callbacks: CallbackMap;
  } | null>(null);

  // The iframe only exists on the Preview tab; treat it as not-ready elsewhere
  // so a queued test run waits for a fresh READY after switching back.
  useEffect(() => {
    if (previewTab !== "preview") previewReadyRef.current = false;
  }, [previewTab]);

  const syncPreview = useCallback(() => {
    if (!selected || !iframeRef.current?.contentWindow) return;
    const defaults = propsMap[selected] ? buildDefaultArgs(propsMap[selected]!) : {};
    postToPreview(iframeRef.current, {
      type: PREVIEW_MESSAGE.SELECT_STORY,
      payload: {
        story: selected,
        args: { ...defaults, ...argsRef.current },
        callbacks: callbacksRef.current,
      },
    });
  }, [selected, propsMap]);

  const syncPreviewTheme = useCallback(() => {
    postToPreview(iframeRef.current, {
      type: PREVIEW_MESSAGE.SET_THEME,
      payload: previewTheme,
    });
  }, [previewTheme]);

  const sendArgs = useCallback((nextArgs: Record<string, unknown>) => {
    postToPreview(iframeRef.current, {
      type: PREVIEW_MESSAGE.UPDATE_ARGS,
      payload: nextArgs,
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (previewReadyRef.current) {
      syncPreview();
    }
  }, [selected, syncPreview]);

  useEffect(() => {
    if (previewReadyRef.current) {
      syncPreviewTheme();
    }
  }, [previewTheme, syncPreviewTheme]);

  // Push callback wiring to the preview whenever it loads or is edited, so the
  // live preview re-wires without re-sending the whole story.
  useEffect(() => {
    if (previewReadyRef.current) {
      postToPreview(iframeRef.current, {
        type: PREVIEW_MESSAGE.SET_CALLBACKS,
        payload: effectiveCallbacks,
      });
    }
  }, [effectiveCallbacks]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === PREVIEW_MESSAGE.INTERACTION) {
        const record = event.data.payload as InteractionRecord;
        setInteractionLog((prev) => [record, ...prev].slice(0, 50));
        // Two-way controls sync: reflect the new controlled value in the args
        // (display only — the preview already holds it, so don't echo back).
        if (record.stateProp && record.next !== undefined) {
          const prop = record.stateProp;
          setArgs((prev) => ({ ...prev, [prop]: record.next }));
        }
        return;
      }
      if (event.data?.type === PREVIEW_MESSAGE.READY) {
        previewReadyRef.current = true;
        syncPreview();
        syncPreviewTheme();
        // A test run was queued while the iframe was unmounted (e.g. on the
        // Variants tab) — fire it now that the preview is ready.
        if (pendingRunRef.current) {
          postToPreview(iframeRef.current, {
            type: PREVIEW_MESSAGE.RUN_TEST,
            payload: pendingRunRef.current,
          });
          pendingRunRef.current = null;
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [syncPreview, syncPreviewTheme]);

  // Load a saved interaction test the first time a component is selected.
  useEffect(() => {
    if (!selected || tests[selected]) return;
    const name = selected;
    let cancelled = false;
    void fetchTest(name).then((loaded) => {
      if (cancelled) return;
      setTests((prev) =>
        prev[name] ? prev : { ...prev, [name]: loaded ?? { component: name, steps: [] } },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selected, tests]);

  // Load saved callback wiring whenever the selected component changes, and
  // clear the live interaction log for the new component.
  useEffect(() => {
    setInteractionLog([]);
    if (!selected) {
      setCallbacks({});
      return;
    }
    let cancelled = false;
    void fetchInteractions(selected).then((loaded) => {
      if (!cancelled) setCallbacks(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Clear stale results when switching components.
  useEffect(() => {
    setTestResults([]);
    setTestRunning(false);
    setVisualEntry(null);
    setVisualDiffDetail(null);
  }, [selected]);

  // Load visual baseline status and report entry when component changes.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setVisualError(null);
    setVisualNotice(null);
    void (async () => {
      const [hasBaseline, report] = await Promise.all([
        checkVisualBaseline(selected),
        fetchVisualReport(),
      ]);
      if (cancelled) return;
      setVisualHasBaseline(hasBaseline);
      const reportEntry = report[selected] ?? null;
      setVisualEntry(reportEntry);
      setVisualImageVersion((v) => v + 1);
      // Load the per-layer detail when the stored report has a multi-layer summary.
      if (reportEntry?.summary) {
        const detail = await fetchVisualDiffDetail(selected);
        if (!cancelled) setVisualDiffDetail(detail);
      } else {
        setVisualDiffDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Collect live step results streamed back from the preview.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === PREVIEW_MESSAGE.TEST_STEP) {
        setTestResults((prev) => [...prev, event.data.payload as StepResult]);
      }
      if (event.data?.type === PREVIEW_MESSAGE.TEST_DONE) {
        setTestRunning(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const currentTest: InteractionTest = selected
    ? (tests[selected] ?? { component: selected, steps: [] })
    : { component: "", steps: [] };

  const updateTest = useCallback(
    (next: InteractionTest) => {
      if (!selected) return;
      setTests((prev) => ({ ...prev, [selected]: next }));
      setTestResults([]);
    },
    [selected],
  );

  const runTest = useCallback(() => {
    if (!selected) return;
    const test = tests[selected] ?? { component: selected, steps: [] };
    if (test.steps.length === 0) return;
    setTestResults([]);
    setTestRunning(true);
    const payload = { story: selected, steps: test.steps, args, callbacks };
    if (previewTab === "preview" && previewReadyRef.current) {
      postToPreview(iframeRef.current, { type: PREVIEW_MESSAGE.RUN_TEST, payload });
    } else {
      // Iframe isn't mounted/ready (e.g. on the Variants tab) — switch to the
      // Preview pane and run once it signals READY.
      pendingRunRef.current = payload;
      if (previewTab !== "preview") setPreviewTab("preview");
    }
  }, [selected, previewTab, tests, args, callbacks]);

  const handleSaveTest = useCallback(async () => {
    if (!selected) return;
    const base = tests[selected] ?? { component: selected, steps: [] };
    const toSave: InteractionTest = { ...base, component: selected, args };
    setTests((prev) => ({ ...prev, [selected]: toSave }));
    // Let errors propagate so the panel can surface a "Save failed" state.
    await saveTest(selected, toSave);
  }, [selected, tests, args]);

  const handleRunVisual = useCallback(async () => {
    if (!selected) return;
    setVisualRunning(true);
    setVisualError(null);
    setVisualNotice(null);
    try {
      const result = await runVisualTest(selected, args, previewTheme);
      // `ok === false` just means differences were found — that's a valid result we
      // must render, not an error. Only a real `error` (e.g. Playwright failure) bails.
      if (result.error) {
        setVisualError(result.error);
        return;
      }
      if (result.entry) setVisualEntry(result.entry);
      if (result.hasBaseline !== undefined) setVisualHasBaseline(result.hasBaseline);
      setVisualImageVersion((v) => v + 1);
      // The compact summary arrives in the response; lazily fetch the full detail.
      if (result.entry?.summary) {
        setVisualDiffDetail(await fetchVisualDiffDetail(selected));
      } else {
        setVisualDiffDetail(null);
      }
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : String(err));
    } finally {
      setVisualRunning(false);
    }
  }, [selected, args, previewTheme]);

  const handleUpdateVisualBaseline = useCallback(async () => {
    if (!selected) return;
    setVisualRunning(true);
    setVisualError(null);
    setVisualNotice(null);
    try {
      const result = await updateVisualBaseline(selected, args, previewTheme);
      if (result.error) {
        setVisualError(result.error);
        return;
      }
      if (result.entry) setVisualEntry(result.entry);
      setVisualHasBaseline(result.hasBaseline ?? true);
      setVisualImageVersion((v) => v + 1);
      setVisualDiffDetail(null);
      setVisualNotice("Baseline updated");
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : String(err));
    } finally {
      setVisualRunning(false);
    }
  }, [selected, args, previewTheme]);

  if (manifest.isLoading) {
    return (
      <div className="bb-layout__center">
        <div className="bb-splash">
          <span className="bb-splash__logo bb-splash__logo--pulse" aria-hidden="true">
            <TideLogo />
          </span>
          <p className="bb-splash__title">Loading your design system…</p>
        </div>
      </div>
    );
  }

  if (manifest.isError) {
    return (
      <div className="bb-layout__center">
        <div className="bb-splash">
          <span className="bb-splash__logo bb-splash__logo--error" aria-hidden="true">
            <TideLogo />
          </span>
          <h1 className="bb-splash__heading">Couldn’t load your design system</h1>
          <p className="bb-splash__text">No manifest was found. Generate one to get started:</p>
          <code className="bb-splash__code">tide generate</code>
        </div>
      </div>
    );
  }

  return (
    <div className="bb-layout">
      <header className="bb-layout__header">
        <div className="bb-appbar__left">
          <div className="bb-brand">
            <span className="bb-brand__logo" aria-hidden="true">
              <TideLogo />
            </span>
            <span className="bb-brand__name">Tide</span>
            <span className="bb-brand__tag">Design</span>
          </div>
          <span className="bb-appbar__divider" aria-hidden="true" />
          <nav className="bb-breadcrumb" aria-label="Breadcrumb">
            {foundationView ? (
              <>
                <span className="bb-breadcrumb__crumb">Foundation</span>
                <span className="bb-breadcrumb__sep" aria-hidden="true">
                  /
                </span>
                <span className="bb-breadcrumb__crumb bb-breadcrumb__crumb--current">
                  {FOUNDATION_ITEMS.find((item) => item.id === foundationView)?.label}
                </span>
              </>
            ) : selectedComponent ? (
              <>
                <span className="bb-breadcrumb__crumb">Components</span>
                <span className="bb-breadcrumb__sep" aria-hidden="true">
                  /
                </span>
                <span className="bb-breadcrumb__crumb bb-breadcrumb__crumb--current">
                  {formatDisplayName(selectedComponent.name)}
                </span>
              </>
            ) : (
              <span className="bb-breadcrumb__crumb">Components</span>
            )}
          </nav>
        </div>
        <div className="bb-appbar__right">
          <button
            type="button"
            className="bb-appbar__search-trigger"
            onClick={() => setPaletteOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M11.5 11.5 14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="bb-appbar__search-text">Search</span>
            <kbd className="bb-appbar__kbd">⌘K</kbd>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="bb-layout__workspace">
        <aside className="bb-sidebar" style={{ width: sidebar.size }}>
          <div className="bb-sidebar__header">
            <label className="bb-sidebar__search">
              <svg
                className="bb-sidebar__search-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M11.5 11.5 14 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                className="bb-sidebar__search-input"
                placeholder="Search components..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <SidebarTree
            foundationItems={FOUNDATION_ITEMS}
            foundationView={foundationView}
            onFoundationSelect={setFoundationView}
            components={filtered}
            selected={selected}
            propsMap={propsMap}
            search={search}
            onComponentSelect={(id, nextArgs) => {
              setFoundationView(null);
              setSelected(id);
              setArgs(nextArgs);
            }}
          />
        </aside>

        <SidebarSplitter isResizing={sidebar.isResizing} onPointerDown={sidebar.onPointerDown} />

        <div className="bb-layout__main">
          {scanReport.data ? <ScanDiagnostics report={scanReport.data} /> : null}
          <section className="bb-layout__preview-section">
            {foundationView === null ? (
              <nav className="bb-layout__preview-tabs">
                <Tabs
                  items={previewTabs}
                  value={previewTab}
                  onChange={setPreviewTab}
                  ariaLabel="Preview"
                />
                <ThemeToggle theme={previewTheme} onToggle={togglePreviewTheme} />
              </nav>
            ) : foundationView !== "tokens" ? (
              <header className="bb-layout__foundation-header">
                <h2 className="bb-layout__foundation-title">
                  {FOUNDATION_ITEMS.find((item) => item.id === foundationView)?.label}
                </h2>
              </header>
            ) : null}

            <div className="bb-layout__preview-body">
              {foundationView === "tokens" ? (
                <TokensPanel tokens={tokens.data ?? null} />
              ) : components.length === 0 ? (
                <p className="bb-layout__empty">
                  No components found. Run <code>tide generate</code>.
                </p>
              ) : previewTab === "preview" ? (
                <iframe
                  ref={iframeRef}
                  className="bb-layout__preview-frame"
                  src={PREVIEW_URL}
                  title="Preview"
                  onLoad={() => {
                    previewReadyRef.current = true;
                    syncPreview();
                    syncPreviewTheme();
                  }}
                />
              ) : selected && selectedComponent ? (
                <VariantsPanel
                  storyId={selected}
                  componentName={selectedComponent.name}
                  props={componentProps}
                  baseArgs={args}
                  theme={previewTheme}
                />
              ) : null}
            </div>
          </section>

          {foundationView === null && (
            <>
              <PanelSplitter
                size={panel.size}
                isResizing={panel.isResizing}
                onPointerDown={panel.onPointerDown}
                onDoubleClick={panel.reset}
              />

              <footer className="bb-layout__panel" style={{ height: panel.size }}>
                <nav className="bb-layout__tabs">
                  <Tabs items={panelTabs} value={tab} onChange={setTab} ariaLabel="Panel" />
                </nav>
                <div className="bb-layout__panel-body">
                  {selected && selectedComponent && tab === "props" && (
                    <ControlsPanel
                      componentName={selectedComponent.name}
                      props={componentProps}
                      args={args}
                      onChange={(next) => {
                        userEditedRef.current = true;
                        setArgs(next);
                        sendArgs(next);
                      }}
                    />
                  )}
                  {selected && selectedComponent && tab === "docs" && (
                    <DocsPanel
                      component={selectedComponent}
                      props={componentProps}
                      args={args}
                      packageName={config.data?.packageName ?? undefined}
                    />
                  )}
                  {selected && selectedComponent && tab === "tests" && (
                    <TestsPanel
                      componentName={selectedComponent.name}
                      test={currentTest}
                      results={testResults}
                      running={testRunning}
                      onChange={updateTest}
                      onRun={runTest}
                      onSave={handleSaveTest}
                    />
                  )}
                  {selected && selectedComponent && tab === "visual" && (
                    <VisualPanel
                      storyId={selected}
                      componentName={selectedComponent.name}
                      args={args}
                      theme={previewTheme}
                      hasBaseline={visualHasBaseline}
                      entry={visualEntry}
                      diffDetail={visualDiffDetail}
                      running={visualRunning}
                      error={visualError}
                      notice={visualNotice}
                      onRun={handleRunVisual}
                      onUpdateBaseline={handleUpdateVisualBaseline}
                      imageVersion={visualImageVersion}
                    />
                  )}
                  {selected && selectedComponent && tab === "interactions" && (
                    <InteractionsPanel
                      componentName={selectedComponent.name}
                      props={componentProps}
                      callbacks={callbacks}
                      bindings={selectedBindings}
                      log={interactionLog}
                      onChange={(next) => {
                        setCallbacks(next);
                        void saveInteractions(selected, next);
                      }}
                    />
                  )}
                </div>
              </footer>
            </>
          )}
        </div>
      </div>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          components={paletteComponents}
          foundation={paletteFoundation}
          onSelectComponent={selectComponentById}
          onSelectFoundation={setFoundationView}
        />
      )}
    </div>
  );
}
