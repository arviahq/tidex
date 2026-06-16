/// <reference types="vite/client" />

declare module "virtual:tidex-stories" {
  import type { ComponentType, ReactNode } from "react";
  import type { StoryModule } from "@tidex/runtime";
  export const stories: Record<string, StoryModule>;
  export const previewWrapper: ComponentType<{ children?: ReactNode }> | null;
}
