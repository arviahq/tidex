import { useEffect, useMemo, useState } from "react";
import type { ComponentEntry } from "@tide/core";
import { buildDefaultArgs, formatDisplayName, getComponentId } from "@tide/core";
import type { PropsMap } from "@tide/core";
import {
  buildComponentTree,
  collectFolderIds,
  type ComponentTreeNode,
} from "../utils/componentTree";
import "./sidebar-tree.css";

type FoundationView = "tokens";

type FoundationItem = {
  id: FoundationView;
  label: string;
  description: string;
};

type SidebarTreeProps = {
  foundationItems: FoundationItem[];
  foundationView: FoundationView | null;
  onFoundationSelect: (view: FoundationView) => void;
  components: ComponentEntry[];
  selected: string | null;
  propsMap: PropsMap;
  search: string;
  onComponentSelect: (name: string, args: Record<string, unknown>) => void;
};

function ChevronIcon() {
  return (
    <svg
      className="bb-tree__folder-chevron"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      className="bb-tree__folder-icon"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 5.5A1 1 0 0 1 3.5 4.5h2.086a1 1 0 0 1 .707.293L7.086 6h5.414A1.5 1.5 0 0 1 14 7.5v4A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-6Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ComponentIcon() {
  return (
    <svg
      className="bb-tree__component-icon"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2.75"
        y="2.75"
        width="10.5"
        height="10.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <rect
        x="5.75"
        y="5.75"
        width="4.5"
        height="4.5"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

type TreeBranchProps = {
  nodes: ComponentTreeNode[];
  depth: number;
  expanded: Set<string>;
  onToggleFolder: (folderId: string) => void;
  selected: string | null;
  foundationView: FoundationView | null;
  onComponentSelect: (entry: ComponentEntry) => void;
};

function TreeBranch({
  nodes,
  depth,
  expanded,
  onToggleFolder,
  selected,
  foundationView,
  onComponentSelect,
}: TreeBranchProps) {
  return (
    <ul
      className={depth === 0 ? "bb-tree" : "bb-tree__group"}
      style={{ ["--bb-tree-depth" as string]: depth }}
    >
      {nodes.map((node) => {
        if (node.kind === "folder") {
          const isExpanded = expanded.has(node.id);
          return (
            <li key={node.id}>
              <button
                type="button"
                className="bb-tree__folder-row"
                data-expanded={isExpanded ? "true" : undefined}
                aria-expanded={isExpanded}
                onClick={() => onToggleFolder(node.id)}
              >
                <ChevronIcon />
                <FolderIcon />
                <span className="bb-tree__folder-label">{node.label}</span>
              </button>
              {isExpanded && node.children.length > 0 ? (
                <TreeBranch
                  nodes={node.children}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggleFolder={onToggleFolder}
                  selected={selected}
                  foundationView={foundationView}
                  onComponentSelect={onComponentSelect}
                />
              ) : null}
            </li>
          );
        }

        const { entry } = node;
        return (
          <li key={`${entry.path}:${entry.exportName}`} className="bb-tree__item-wrap">
            <button
              type="button"
              className="bb-sidebar__item bb-sidebar__item--tree"
              data-active={!foundationView && selected === getComponentId(entry) ? "true" : undefined}
              onClick={() => onComponentSelect(entry)}
            >
              <ComponentIcon />
              <span className="bb-sidebar__item-title">{formatDisplayName(entry.name)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarTree({
  foundationItems,
  foundationView,
  onFoundationSelect,
  components,
  selected,
  propsMap,
  search,
  onComponentSelect,
}: SidebarTreeProps) {
  const tree = useMemo(() => buildComponentTree(components), [components]);
  const allFolderIds = useMemo(() => collectFolderIds(tree), [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allFolderIds));

  useEffect(() => {
    setExpanded((current) => {
      const next = new Set(current);
      for (const id of allFolderIds) next.add(id);
      return next;
    });
  }, [allFolderIds]);

  useEffect(() => {
    if (search.trim()) {
      setExpanded(new Set(allFolderIds));
    }
  }, [search, allFolderIds]);

  const toggleFolder = (folderId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleComponentSelect = (entry: ComponentEntry) => {
    const componentId = getComponentId(entry);
    const schema = propsMap[componentId];
    const args = schema ? buildDefaultArgs(schema) : {};
    onComponentSelect(componentId, args);
  };

  return (
    <nav className="bb-sidebar__nav" aria-label="Sidebar">
      <div className="bb-sidebar__section">
        <span className="bb-sidebar__section-label">Foundation</span>
      </div>

      <ul className="bb-sidebar__list bb-sidebar__list--foundation">
        {foundationItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="bb-sidebar__item"
              data-active={foundationView === item.id ? "true" : undefined}
              onClick={() => onFoundationSelect(item.id)}
            >
              <span
                className="bb-sidebar__item-icon bb-sidebar__item-icon--foundation"
                aria-hidden="true"
              >
                {item.id === "tokens" ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="8" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : (
                  item.label.charAt(0)
                )}
              </span>
              <span className="bb-sidebar__item-body">
                <span className="bb-sidebar__item-title">{item.label}</span>
                <span className="bb-sidebar__item-path">{item.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="bb-sidebar__section bb-sidebar__section--components">
        <span className="bb-sidebar__section-label">Components</span>
        <span className="bb-sidebar__count">{components.length}</span>
      </div>

      {components.length === 0 ? (
        <p className="bb-sidebar__empty">No components match your search.</p>
      ) : (
        <TreeBranch
          nodes={tree}
          depth={0}
          expanded={expanded}
          onToggleFolder={toggleFolder}
          selected={selected}
          foundationView={foundationView}
          onComponentSelect={handleComponentSelect}
        />
      )}
    </nav>
  );
}
