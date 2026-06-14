/// <reference types="vite/client" />

declare module "virtual:tide-stories" {
  import type { StoryModule } from "@tide/runtime";
  export const stories: Record<string, StoryModule>;
}
