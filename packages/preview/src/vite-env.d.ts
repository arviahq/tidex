/// <reference types="vite/client" />

declare module "virtual:tide-stories" {
  import type { ComponentType, ReactNode } from "react";
  import type { StoryModule } from "@tide/runtime";
  export const stories: Record<string, StoryModule>;
  export const previewWrapper: ComponentType<{ children?: ReactNode }> | null;
}
