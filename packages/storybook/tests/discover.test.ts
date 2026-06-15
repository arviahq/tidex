import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverStories, locateStorybook, hasStorybook } from "../src/discover.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "fixtures", "storybook");

describe("locateStorybook", () => {
  it("reads story globs from .storybook/main.* and rebases onto the root", () => {
    const loc = locateStorybook(root);
    expect(loc.hasConfigDir).toBe(true);
    expect(loc.storyGlobs).toEqual(["src/**/*.stories.@(tsx|ts)"]);
    expect(loc.previewPath).toBe(".storybook/preview.ts");
  });

  it("detects a Storybook project", () => {
    expect(hasStorybook(root)).toBe(true);
  });
});

describe("discoverStories", () => {
  const result = discoverStories(root);
  const byId = Object.fromEntries(result.components.map((c) => [c.id, c]));

  it("creates one entry per CSF3 story, ids derived from title + story name", () => {
    expect(byId["Forms/Button/Primary"]).toMatchObject({
      source: "csf",
      name: "Primary",
      storyExport: "Primary",
      title: "Forms/Button/Primary",
      storyFile: "src/forms/Button.stories.tsx",
    });
    // story `name` override is sanitized into the id and kept as display name
    expect(byId["Forms/Button/Secondary-Button"]).toMatchObject({
      source: "csf",
      name: "Secondary Button",
      storyExport: "Secondary",
    });
  });

  it("ignores non-story named exports", () => {
    expect(byId["Forms/Button/helperValue"]).toBeUndefined();
    expect(result.components.some((c) => c.name === "helperValue")).toBe(false);
  });

  it("discovers CSF2 Template.bind stories by export name", () => {
    expect(byId["Legacy/Banner/Info"]).toMatchObject({ source: "csf", storyExport: "Info" });
    expect(byId["Legacy/Banner/Warning"]).toMatchObject({ source: "csf", storyExport: "Warning" });
  });

  it("maps argTypes to control schemas (select/radio -> union, text, boolean)", () => {
    expect(result.props["Forms/Button/Primary"]).toMatchObject({
      variant: { type: "union", values: ["primary", "secondary", "ghost"] },
      size: { type: "union", values: ["sm", "md", "lg"] },
      disabled: { type: "boolean" },
      label: { type: "string" },
    });
  });

  it("drops callback args from the schema (e.g. onClick)", () => {
    expect(result.props["Forms/Button/Primary"]?.onClick).toBeUndefined();
    expect(result.props["Forms/Button/Secondary-Button"]?.onClick).toBeUndefined();
  });

  it("extracts literal arg values (meta + story merged) as defaults", () => {
    expect(result.defaults["Forms/Button/Primary"]).toEqual({
      label: "Click me",
      disabled: false,
      variant: "primary",
      size: "md",
    });
    // function-valued args are omitted; literals survive
    expect(result.defaults["Forms/Button/Secondary-Button"]).toEqual({
      label: "Click me",
      disabled: false,
      variant: "secondary",
      size: "lg",
    });
  });

  it("resolves a preview annotations path for full-fidelity globals", () => {
    expect(result.previewPath).toBe(".storybook/preview.ts");
  });

  it("derives a title from the path for untitled stories, without a doubled segment", () => {
    // src/atoms/gauge/Gauge.stories.tsx (no meta.title) -> Atoms/Gauge, not Atoms/Gauge/Gauge
    expect(byId["Atoms/Gauge/Playground"]).toMatchObject({ source: "csf", name: "Playground" });
    expect(byId["Atoms/Gauge/Gauge/Playground"]).toBeUndefined();
  });
});
