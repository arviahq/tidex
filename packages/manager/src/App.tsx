import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildDefaultArgs, formatDisplayName } from "@tide/core";
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
import { PanelSplitter } from "./components/PanelSplitter";
import { SidebarSplitter } from "./components/SidebarSplitter";
import { ThemeToggle } from "./components/ThemeToggle";
import { Tabs } from "./components/Tabs";
import { PREVIEW_URL, PREVIEW_MESSAGE, postToPreview, fetchTest, saveTest } from "./api";
import "./components/layout.css";

type PanelTab = "props" | "docs" | "tests";
type PreviewTab = "preview" | "variants";
type FoundationView = "tokens";

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "props", label: "Props" },
  { id: "docs", label: "Docs" },
  { id: "tests", label: "Tests" },
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
  const { manifest, props, tokens } = useTideData();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [foundationView, setFoundationView] = useState<FoundationView | null>(null);
  const [tab, setTab] = useState<PanelTab>("props");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("preview");
  const [args, setArgs] = useState<Record<string, unknown>>({});
  const [tests, setTests] = useState<Record<string, InteractionTest>>({});
  const [testResults, setTestResults] = useState<StepResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);
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
        formatDisplayName(c.name).toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q),
    );
  }, [components, search]);

  useEffect(() => {
    if (!selected && components.length > 0) {
      setSelected(components[0]!.name);
    }
  }, [components, selected]);

  const selectedComponent = components.find((c) => c.name === selected);
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

  useEffect(() => {
    if (selected && propsMap[selected]) {
      setArgs(buildDefaultArgs(propsMap[selected]!));
    }
  }, [selected, propsMap]);

  const previewReadyRef = useRef(false);
  const pendingRunRef = useRef<{
    story: string;
    steps: InteractionStep[];
    args: Record<string, unknown>;
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
      payload: { story: selected, args: { ...defaults, ...args } },
    });
  }, [selected, args, propsMap]);

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

  // Clear stale results when switching components.
  useEffect(() => {
    setTestResults([]);
    setTestRunning(false);
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
    const payload = { story: selected, steps: test.steps, args };
    if (previewTab === "preview" && previewReadyRef.current) {
      postToPreview(iframeRef.current, { type: PREVIEW_MESSAGE.RUN_TEST, payload });
    } else {
      // Iframe isn't mounted/ready (e.g. on the Variants tab) — switch to the
      // Preview pane and run once it signals READY.
      pendingRunRef.current = payload;
      if (previewTab !== "preview") setPreviewTab("preview");
    }
  }, [selected, previewTab, tests, args]);

  const handleSaveTest = useCallback(async () => {
    if (!selected) return;
    const base = tests[selected] ?? { component: selected, steps: [] };
    const toSave: InteractionTest = { ...base, component: selected, args };
    setTests((prev) => ({ ...prev, [selected]: toSave }));
    // Let errors propagate so the panel can surface a "Save failed" state.
    await saveTest(selected, toSave);
  }, [selected, tests, args]);

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

          <nav className="bb-sidebar__nav" aria-label="Sidebar">
            <div className="bb-sidebar__section">
              <span className="bb-sidebar__section-label">Foundation</span>
            </div>

            <ul className="bb-sidebar__list bb-sidebar__list--foundation">
              {FOUNDATION_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="bb-sidebar__item"
                    data-active={foundationView === item.id ? "true" : undefined}
                    onClick={() => setFoundationView(item.id)}
                  >
                    <span
                      className="bb-sidebar__item-icon bb-sidebar__item-icon--foundation"
                      aria-hidden="true"
                    >
                      {item.id === "tokens" ? (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      ) : (
                        item.label.charAt(0)
                      )}
                    </span>
                    <span className="bb-sidebar__item-body">
                      <span className="bb-sidebar__item-title">{item.label}</span>
                      <span className="bb-sidebar__item-path">{item.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="bb-sidebar__section bb-sidebar__section--components">
              <span className="bb-sidebar__section-label">Components</span>
              <span className="bb-sidebar__count">{filtered.length}</span>
            </div>

            {filtered.length === 0 ? (
              <p className="bb-sidebar__empty">No components match your search.</p>
            ) : (
              <ul className="bb-sidebar__list">
                {filtered.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      className="bb-sidebar__item"
                      data-active={!foundationView && selected === c.name ? "true" : undefined}
                      onClick={() => {
                        setFoundationView(null);
                        setSelected(c.name);
                        if (propsMap[c.name]) {
                          setArgs(buildDefaultArgs(propsMap[c.name]!));
                        }
                      }}
                    >
                      <span className="bb-sidebar__item-icon" aria-hidden="true">
                        {c.name.charAt(0)}
                      </span>
                      <span className="bb-sidebar__item-body">
                        <span className="bb-sidebar__item-title">{formatDisplayName(c.name)}</span>
                        <span className="bb-sidebar__item-path">{c.title}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        <SidebarSplitter isResizing={sidebar.isResizing} onPointerDown={sidebar.onPointerDown} />

        <div className="bb-layout__main">
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
              ) : selected ? (
                <VariantsPanel
                  componentName={selected}
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
                      componentName={selected}
                      props={componentProps}
                      args={args}
                      onChange={(next) => {
                        setArgs(next);
                        sendArgs(next);
                      }}
                    />
                  )}
                  {selected && selectedComponent && tab === "docs" && (
                    <DocsPanel component={selectedComponent} props={componentProps} args={args} />
                  )}
                  {selected && tab === "tests" && (
                    <TestsPanel
                      componentName={selected}
                      test={currentTest}
                      results={testResults}
                      running={testRunning}
                      onChange={updateTest}
                      onRun={runTest}
                      onSave={handleSaveTest}
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
