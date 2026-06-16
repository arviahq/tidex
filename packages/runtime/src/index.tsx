import React, { Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

export interface StoryModule {
  load: () => Promise<Record<string, unknown>>;
  exportName: string;
  isDefault: boolean;
  args: Record<string, unknown>;
  title: string;
  path: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class PreviewErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "#dc2626", fontFamily: "monospace" }}>
          <h3>Component Error</h3>
          <pre>{this.state.error.message}</pre>
          <pre style={{ fontSize: 12, opacity: 0.7 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

let root: Root | null = null;

export async function renderStory(
  story: StoryModule,
  args: Record<string, unknown>,
  container: HTMLElement,
): Promise<void> {
  const mod = await story.load();
  const Component = story.isDefault
    ? (mod.default as React.ComponentType<Record<string, unknown>>)
    : (mod[story.exportName] as React.ComponentType<Record<string, unknown>>);

  if (!Component) {
    throw new Error(`Could not resolve export "${story.exportName}" from ${story.path}`);
  }

  if (!root) {
    root = createRoot(container);
  }

  root.render(
    <PreviewErrorBoundary>
      <Component {...args} />
    </PreviewErrorBoundary>,
  );
}

export function unmountPreview(): void {
  root?.unmount();
  root = null;
}

export const PREVIEW_MESSAGE = {
  UPDATE_ARGS: "TIDEX_UPDATE_ARGS",
  SELECT_STORY: "TIDEX_SELECT_STORY",
  READY: "TIDEX_READY",
  SET_THEME: "TIDEX_SET_THEME",
  // Variant tiles report their natural content size to the manager (iframe -> parent),
  // which replies with the shared fit bounds so every tile uses one scale factor.
  CONTENT_SIZE: "TIDEX_CONTENT_SIZE",
  SET_FIT_BOUNDS: "TIDEX_SET_FIT_BOUNDS",
  // Interaction tests: manager -> preview to run a list of steps; preview -> manager
  // with the result of each step (live) and a final done signal.
  RUN_TEST: "TIDEX_RUN_TEST",
  TEST_STEP: "TIDEX_TEST_STEP",
  TEST_DONE: "TIDEX_TEST_DONE",
  // manager -> preview: explicit callback→state wiring for the current story,
  // sent with SELECT_STORY and pushed live when edited in the Interactions tab.
  SET_CALLBACKS: "TIDEX_SET_CALLBACKS",
  // preview -> manager: a wired callback fired. Drives the interaction log and
  // two-way controls sync (the manager applies the new controlled value).
  INTERACTION: "TIDEX_INTERACTION",
  // manager -> preview: canvas view state from the preview toolbar — zoom level,
  // forced pseudo-states (:hover/:focus/:active), element outlines, background grid.
  SET_VIEW: "TIDEX_SET_VIEW",
  // manager -> preview: re-mount the current story from scratch (resets state).
  RELOAD: "TIDEX_RELOAD",
} as const;
