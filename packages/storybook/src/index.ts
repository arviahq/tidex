// Node entry — Storybook (CSF) ingestion: discovery, codegen, and Vite reuse.
// The client-safe argTypes mapper lives in `@tide/storybook/runtime`.
export {
  discoverStories,
  hasStorybook,
  locateStorybook,
  resolveStorybookOptions,
  DEFAULT_STORY_GLOBS,
  type StorybookLocation,
  type DiscoverStoriesResult,
  type ResolvedStorybookOptions,
} from "./discover.js";

export { csfPreamble, csfStoryEntry, type CsfPreamble } from "./codegen.js";

export { loadProjectVitePlugins, storybookPreviewVite } from "./vite.js";
