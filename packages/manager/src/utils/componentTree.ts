import type { ComponentEntry } from "@tide/core";
import { formatDisplayName } from "@tide/core";

export type ComponentTreeFolder = {
  kind: "folder";
  id: string;
  label: string;
  children: ComponentTreeNode[];
};

export type ComponentTreeLeaf = {
  kind: "component";
  entry: ComponentEntry;
};

export type ComponentTreeNode = ComponentTreeFolder | ComponentTreeLeaf;

function formatFolderLabel(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** Folder segments relative to the `components` directory, e.g. ["forms"] or []. */
export function getComponentFolderSegments(entry: ComponentEntry): string[] {
  const normalized = entry.path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) return [];

  const parts = normalized.slice(0, lastSlash).split("/").filter(Boolean);
  const componentsIdx = parts.lastIndexOf("components");
  if (componentsIdx >= 0) return parts.slice(componentsIdx + 1);

  const titleParts = entry.title.split("/");
  titleParts.pop();
  return titleParts.map((part) => part.toLowerCase());
}

function insertEntry(
  tree: ComponentTreeNode[],
  segments: string[],
  entry: ComponentEntry,
  prefix = "",
): void {
  if (segments.length === 0) {
    tree.push({ kind: "component", entry });
    return;
  }

  const head = segments[0]!;
  const folderId = prefix ? `${prefix}/${head}` : head;
  let folder = tree.find(
    (node): node is ComponentTreeFolder => node.kind === "folder" && node.id === folderId,
  );

  if (!folder) {
    folder = {
      kind: "folder",
      id: folderId,
      label: formatFolderLabel(head),
      children: [],
    };
    tree.push(folder);
  }

  insertEntry(folder.children, segments.slice(1), entry, folderId);
}

function sortTree(nodes: ComponentTreeNode[]): ComponentTreeNode[] {
  return nodes
    .map((node) => (node.kind === "folder" ? { ...node, children: sortTree(node.children) } : node))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      if (a.kind === "folder" && b.kind === "folder") {
        return a.label.localeCompare(b.label);
      }
      if (a.kind === "component" && b.kind === "component") {
        return formatDisplayName(a.entry.name).localeCompare(formatDisplayName(b.entry.name));
      }
      return 0;
    });
}

export function buildComponentTree(entries: ComponentEntry[]): ComponentTreeNode[] {
  const root: ComponentTreeNode[] = [];
  for (const entry of entries) {
    insertEntry(root, getComponentFolderSegments(entry), entry);
  }
  return sortTree(root);
}

export function collectFolderIds(nodes: ComponentTreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.kind === "folder") {
      ids.push(node.id);
      ids.push(...collectFolderIds(node.children));
    }
  }
  return ids;
}
