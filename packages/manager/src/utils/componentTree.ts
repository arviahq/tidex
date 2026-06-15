import type { ComponentEntry } from "@tide/core";
import { formatDisplayName, getComponentId } from "@tide/core";

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

/** Folder segments derived from the stable component id, e.g. ["forms"] or []. */
export function getComponentFolderSegments(entry: ComponentEntry): string[] {
  const id = getComponentId(entry);
  const slash = id.lastIndexOf("/");
  if (slash === -1) return [];
  return id.slice(0, slash).split("/").filter(Boolean);
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

/** A top-level sidebar section, e.g. Storybook roots like `Components` / `Next`. */
export type ComponentSection = {
  key: string;
  label: string;
  nodes: ComponentTreeNode[];
};

/**
 * Group components into sections by their top-level folder (the first id
 * segment) — mirroring Storybook's root sections. Top-level components with no
 * folder fall under a default "Components" section. Sections merge
 * case-insensitively so inconsistent title casing ("Components" vs
 * "components") doesn't split into two headers.
 */
export function buildComponentSections(entries: ComponentEntry[]): ComponentSection[] {
  const tree = buildComponentTree(entries);
  const folders = new Map<string, ComponentSection>();
  const loose: ComponentTreeNode[] = [];

  for (const node of tree) {
    if (node.kind === "folder") {
      const key = node.label.toLowerCase();
      const existing = folders.get(key);
      if (existing) existing.nodes.push(...node.children);
      else folders.set(key, { key, label: node.label, nodes: [...node.children] });
    } else {
      loose.push(node);
    }
  }

  const sections = [...folders.values()]
    .map((s) => ({ ...s, nodes: sortTree(s.nodes) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  if (loose.length > 0) {
    sections.push({ key: "__components", label: "Components", nodes: sortTree(loose) });
  }
  return sections;
}

/** Total component leaves under a set of nodes (for a section's count badge). */
export function countLeaves(nodes: ComponentTreeNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.kind === "component") total += 1;
    else total += countLeaves(node.children);
  }
  return total;
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
