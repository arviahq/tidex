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

class PreviewErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
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
  UPDATE_ARGS: "TIDE_UPDATE_ARGS",
  SELECT_STORY: "TIDE_SELECT_STORY",
  READY: "TIDE_READY",
  SET_THEME: "TIDE_SET_THEME",
  // Variant tiles report their natural content size to the manager (iframe -> parent),
  // which replies with the shared fit bounds so every tile uses one scale factor.
  CONTENT_SIZE: "TIDE_CONTENT_SIZE",
  SET_FIT_BOUNDS: "TIDE_SET_FIT_BOUNDS",
} as const;
