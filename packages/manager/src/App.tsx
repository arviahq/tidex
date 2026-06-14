import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { buildDefaultArgs, formatDisplayName, getComponentId } from "@tide/core";
import type {
  ComponentEntry,
  InteractionStep,
  InteractionTest,
  PropSchema,
  PropsMap,
  StepResult,
} from "@tide/core";
import { computeVariants } from "@tide/react";
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
  type CallbackMap,
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

export function App() {
  const queryClient = useQueryClient();
  const { manifest, props, tokens, config, scanReport } = useTideData();

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
  const [tab, setTab] = useState<PanelTab>("props");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("preview");
  const [args, setArgs] = useState<Record<string, unknown>>({});
  const [callbacks, setCallbacks] = useState<CallbackMap>({});
  const [tests, setTests] = useState<Record<string, InteractionTest>>({});
  const [testResults, setTestResults] = useState<StepResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [visualRunning, setVisualRunning] = useState(false);
  const [visualEntry, setVisualEntry] = useState<VisualPanelEntry | null>(null);
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

  const selectedComponent = components.find((c) => getComponentId(c) === selected);
  const defaultOverrides = selected ? config.data?.defaults?.[selected] : undefined;
  const componentProps = useMemo(() => {
    if (!selected) return EMPTY_COMPONENT_PROPS;
    return propsMap[selected] ?? EMPTY_COMPONENT_PROPS;
  }, [selected, propsMap]);

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

  // Reset args to defaults when the *selected component* changes, but preserve
  // the user's in-progress values when props are merely regenerated for the same
  // component (e.g. after an edit): keep existing values for props that still
  // exist, add defaults for newly-added props, and drop removed ones.
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || !propsMap[selected]) return;
    const defaults = buildDefaultArgs(propsMap[selected]!, defaultOverrides);
    if (prevSelectedRef.current === selected) {
      setArgs((prev) => {
        const merged: Record<string, unknown> = {};
        for (const key of Object.keys(defaults)) {
          merged[key] = key in prev ? prev[key] : defaults[key];
        }
        return merged;
      });
    } else {
      prevSelectedRef.current = selected;
      setArgs(defaults);
    }
  }, [selected, propsMap, defaultOverrides]);

  const previewReadyRef = useRef(false);
  const argsRef = useRef(args);
  argsRef.current = args;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
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
        payload: callbacks,
      });
    }
  }, [callbacks]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
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

  // Load saved callback wiring whenever the selected component changes.
  useEffect(() => {
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
      setVisualEntry(report[selected] ?? null);
      setVisualImageVersion((v) => v + 1);
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
      if (result.error || result.ok === false) {
        setVisualError(result.error ?? "Visual test failed");
        return;
      }
      if (result.entry) setVisualEntry(result.entry);
      if (result.hasBaseline !== undefined) setVisualHasBaseline(result.hasBaseline);
      setVisualImageVersion((v) => v + 1);
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
      if (result.error || result.ok === false) {
        setVisualError(result.error ?? "Failed to update baseline");
        return;
      }
      if (result.entry) setVisualEntry(result.entry);
      setVisualHasBaseline(result.hasBaseline ?? true);
      setVisualImageVersion((v) => v + 1);
      setVisualNotice("Baseline updated");
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : String(err));
    } finally {
      setVisualRunning(false);
    }
  }, [selected, args, previewTheme]);

  if (manifest.isLoading) {
    return <div className="bb-layout__center">Loading Tide...</div>;
  }

  if (manifest.isError) {
    return (
      <div className="bb-layout__center">
        <p>
          Failed to load manifest. Run <code>tide generate</code> first.
        </p>
      </div>
    );
  }

  return (
    <div className="bb-layout">
      <header className="bb-layout__header">
        <ThemeToggle />
      </header>

      <div className="bb-layout__workspace">
        <aside className="bb-sidebar" style={{ width: sidebar.size }}>
          <div className="bb-sidebar__header">
            <div className="bb-sidebar__brand">
              <span className="bb-sidebar__logo" aria-hidden="true">
                B
              </span>
              <span className="bb-sidebar__title">Tide</span>
            </div>

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
          {scanReport.data?.warnings?.length ? (
            <div className="bb-layout__scan-warnings" role="status">
              {scanReport.data.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
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
                  <Tabs items={PANEL_TABS} value={tab} onChange={setTab} ariaLabel="Panel" />
                </nav>
                <div className="bb-layout__panel-body">
                  {selected && selectedComponent && tab === "props" && (
                    <ControlsPanel
                      componentName={selectedComponent.name}
                      props={componentProps}
                      args={args}
                      onChange={(next) => {
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
    </div>
  );
}
