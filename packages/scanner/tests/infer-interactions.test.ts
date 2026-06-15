import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverComponents } from "../src/discover.js";
import { extractProps } from "../src/extract-props.js";
import { inferInteractions } from "../src/infer-interactions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures");

async function infer(file: string) {
  const abs = path.join(fixtures, file);
  const components = discoverComponents(fixtures, [abs]);
  const props = await extractProps(fixtures, components);
  return { components, bindings: inferInteractions(fixtures, components, props) };
}

describe("inferInteractions", () => {
  it("pairs canonical/convention handlers with their controlled prop", async () => {
    const { bindings } = await infer("interactive-props.tsx");
    const dialog = bindings["Dialog"] ?? [];
    const byHandler = Object.fromEntries(dialog.map((b) => [b.handler, b]));

    expect(byHandler["onOpenChange"]).toMatchObject({
      stateProp: "open",
      strategy: "first-arg",
      confidence: "high",
    });
    expect(byHandler["onSelectionChange"]).toMatchObject({
      stateProp: "selectedKeys",
      strategy: "set",
      confidence: "high",
    });
  });

  it("infers event-value for native value+onChange and confirms via source", async () => {
    const { bindings } = await infer("interactive-props.tsx");
    const field = bindings["Field"] ?? [];
    const onChange = field.find((b) => b.handler === "onChange");
    expect(onChange).toMatchObject({
      stateProp: "value",
      strategy: "event-value",
      confidence: "high",
    });
    // The call site `onChange(e)` was observed, so the source confirms it.
    expect(onChange?.source).toBe("static");
  });

  it("refines a medium-confidence pair to toggle from the source call site", async () => {
    const { bindings } = await infer("interactive-props.tsx");
    const onActivate = (bindings["Switch"] ?? []).find((b) => b.handler === "onActivate");
    // Convention alone would be medium/toggle; the `onActivate(!active)` call
    // site confirms toggle and promotes confidence to high.
    expect(onActivate).toMatchObject({
      stateProp: "active",
      strategy: "toggle",
      confidence: "high",
      source: "static",
    });
  });
});
