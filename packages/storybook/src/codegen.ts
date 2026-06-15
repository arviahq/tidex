// Code generation for CSF story entries in `.tide/stories.generated.ts`.
//
// A CSF story is rendered through Storybook's portable-stories `composeStory`,
// which returns a plain React component with all decorators/args/globals
// applied. We expose that component as the module's `default` so Tide's normal
// render path picks it up unchanged, and attach `__tideStory` — the story's
// *resolved* argTypes/args/component name — so the preview can hydrate the
// manager's controls to match Storybook exactly (computed select options, real
// arg values, required flags, layout) rather than Tide's static best-effort.

export interface CsfPreamble {
  /** Import + helper lines to prepend to the generated stories file. */
  lines: string[];
  /** Expression passed as `composeStory`'s project annotations argument. */
  projectAnnotations: string;
}

/**
 * Imports and the inline `__tideStoryMeta` helper shared by every CSF entry.
 * `@storybook/react` and `.storybook/preview` resolve from the user project
 * (the generated file lives under their `.tide/`).
 */
export function csfPreamble(opts: {
  hasCsf: boolean;
  previewImportPath: string | null;
}): CsfPreamble {
  if (!opts.hasCsf) return { lines: [], projectAnnotations: "undefined" };

  const lines = [`import { composeStory as __composeStory } from "@storybook/react";`];
  let projectAnnotations = "undefined";
  if (opts.previewImportPath) {
    lines.push(`import * as __previewAnnotations from ${JSON.stringify(opts.previewImportPath)};`);
    projectAnnotations = "(__previewAnnotations.default ?? __previewAnnotations)";
  }

  // Inline (no import — the user project has no @tide dependency). Pulls the
  // fully-resolved metadata Storybook computes for the composed story.
  lines.push(
    `function __tideStoryMeta(meta, Composed) {
  const c = meta && meta.component;
  return {
    argTypes: Composed.argTypes || {},
    args: Composed.args || {},
    componentName: (c && (c.displayName || c.name)) || null,
    parameters: Composed.parameters || {},
  };
}`,
  );

  return { lines, projectAnnotations };
}

/** One CSF story entry for the `stories` map. Import paths are pre-resolved. */
export function csfStoryEntry(opts: {
  componentId: string;
  storyImportPath: string;
  exportName: string;
  argsJson: string;
  title: string;
  name: string;
  path: string;
  projectAnnotations: string;
}): string {
  return `  ${JSON.stringify(opts.componentId)}: {
    load: async () => {
      const __m = await import(${JSON.stringify(opts.storyImportPath)});
      const __Composed = __composeStory(__m[${JSON.stringify(opts.exportName)}], __m.default, ${opts.projectAnnotations}, ${JSON.stringify(opts.exportName)});
      return { default: __Composed, __tideStory: __tideStoryMeta(__m.default, __Composed) };
    },
    exportName: "default",
    isDefault: true,
    args: ${opts.argsJson},
    title: ${JSON.stringify(opts.title)},
    path: ${JSON.stringify(opts.path)},
    name: ${JSON.stringify(opts.name)},
  }`;
}
