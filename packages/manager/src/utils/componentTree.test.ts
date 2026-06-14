import { describe, expect, it } from "vitest";
import type { ComponentEntry } from "@tide/core";
import { buildComponentTree, collectFolderIds, getComponentFolderSegments } from "./componentTree";

function entry(name: string, path: string, title: string): ComponentEntry {
  return { name, path, exportName: name, title };
}

describe("getComponentFolderSegments", () => {
  it("returns segments after components directory", () => {
    expect(
      getComponentFolderSegments(
        entry("Modal", "src/components/overlays/Modal.tsx", "Components/Overlays/Modal"),
      ),
    ).toEqual(["overlays"]);
  });

  it("returns empty array for root-level components", () => {
    expect(
      getComponentFolderSegments(entry("Button", "src/components/Button.tsx", "Components/Button")),
    ).toEqual([]);
  });
});

describe("buildComponentTree", () => {
  it("groups components by folder and sorts entries", () => {
    const tree = buildComponentTree([
      entry("Button", "src/components/Button.tsx", "Components/Button"),
      entry("Modal", "src/components/overlays/Modal.tsx", "Components/Overlays/Modal"),
      entry("Alert", "src/components/feedback/Alert.tsx", "Components/Feedback/Alert"),
    ]);

    expect(tree).toHaveLength(3);
    expect(tree[0]?.kind).toBe("folder");
    expect(tree[0]?.kind === "folder" && tree[0].label).toBe("Feedback");
    expect(tree[1]?.kind).toBe("folder");
    expect(tree[2]?.kind).toBe("component");
    expect(tree[2]?.kind === "component" && tree[2].entry.name).toBe("Button");

    const overlayFolder = tree.find(
      (node): node is Extract<(typeof tree)[number], { kind: "folder" }> =>
        node.kind === "folder" && node.id === "overlays",
    );
    expect(overlayFolder).toBeDefined();
    expect(overlayFolder!.children).toHaveLength(1);
    expect(
      overlayFolder!.children[0]?.kind === "component" && overlayFolder!.children[0].entry.name,
    ).toBe("Modal");
  });

  it("collects folder ids for expand state", () => {
    const tree = buildComponentTree([
      entry("Modal", "src/components/overlays/Modal.tsx", "Components/Overlays/Modal"),
    ]);
    expect(collectFolderIds(tree)).toEqual(["overlays"]);
  });
});
