import { useEffect, useMemo, useRef, useState } from "react";
import "./command-palette.css";

type FoundationView = "tokens";

export interface PaletteComponent {
  id: string;
  label: string;
  sublabel: string;
}

export interface PaletteFoundation {
  id: FoundationView;
  label: string;
  sublabel: string;
}

interface CommandPaletteProps {
  onClose: () => void;
  components: PaletteComponent[];
  foundation: PaletteFoundation[];
  onSelectComponent: (id: string) => void;
  onSelectFoundation: (id: FoundationView) => void;
}

type FlatEntry =
  | { kind: "foundation"; id: FoundationView; label: string; sublabel: string }
  | { kind: "component"; id: string; label: string; sublabel: string };

function score(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export function CommandPalette({
  onClose,
  components,
  foundation,
  onSelectComponent,
  onSelectFoundation,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { foundationMatches, componentMatches, flat } = useMemo(() => {
    const f = foundation.filter((item) => score(`${item.label} ${item.sublabel}`, query));
    const c = components.filter((item) =>
      score(`${item.label} ${item.sublabel} ${item.id}`, query),
    );
    const flatList: FlatEntry[] = [
      ...f.map((item): FlatEntry => ({ kind: "foundation", ...item })),
      ...c.map((item): FlatEntry => ({ kind: "component", ...item })),
    ];
    return { foundationMatches: f, componentMatches: c, flat: flatList };
  }, [foundation, components, query]);

  // Keep the highlighted row valid as the result set shrinks/grows.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Lock background scroll while the overlay is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const commit = (entry: FlatEntry | undefined) => {
    if (!entry) return;
    if (entry.kind === "foundation") onSelectFoundation(entry.id);
    else onSelectComponent(entry.id);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(flat[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const renderRow = (entry: FlatEntry, flatIndex: number) => {
    const active = flatIndex === activeIndex;
    return (
      <button
        key={`${entry.kind}:${entry.id}`}
        type="button"
        role="option"
        aria-selected={active}
        data-active={active ? "true" : undefined}
        className="bb-cmdk__row"
        onMouseMove={() => setActiveIndex(flatIndex)}
        onClick={() => commit(entry)}
      >
        <span className="bb-cmdk__row-icon" aria-hidden="true">
          {entry.kind === "foundation" ? <TokensGlyph /> : <ComponentGlyph />}
        </span>
        <span className="bb-cmdk__row-body">
          <span className="bb-cmdk__row-label">{entry.label}</span>
          <span className="bb-cmdk__row-sublabel">{entry.sublabel}</span>
        </span>
        <span className="bb-cmdk__row-kind">
          {entry.kind === "foundation" ? "Foundation" : "Component"}
        </span>
      </button>
    );
  };

  return (
    <div className="bb-cmdk" role="presentation" onMouseDown={onClose}>
      <div
        className="bb-cmdk__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="bb-cmdk__search">
          <svg
            className="bb-cmdk__search-icon"
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M11.5 11.5 14 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            className="bb-cmdk__input"
            type="text"
            placeholder="Search components and foundations…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          <kbd className="bb-cmdk__esc">Esc</kbd>
        </div>

        <div className="bb-cmdk__list" ref={listRef} role="listbox">
          {flat.length === 0 ? (
            <p className="bb-cmdk__empty">No matches for “{query}”.</p>
          ) : (
            <>
              {foundationMatches.length > 0 && (
                <div className="bb-cmdk__group">
                  <div className="bb-cmdk__group-label">Foundation</div>
                  {foundationMatches.map((item) =>
                    renderRow(
                      { kind: "foundation", ...item },
                      flat.findIndex((f) => f.kind === "foundation" && f.id === item.id),
                    ),
                  )}
                </div>
              )}
              {componentMatches.length > 0 && (
                <div className="bb-cmdk__group">
                  <div className="bb-cmdk__group-label">Components</div>
                  {componentMatches.map((item) =>
                    renderRow(
                      { kind: "component", ...item },
                      flat.findIndex((f) => f.kind === "component" && f.id === item.id),
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="bb-cmdk__footer">
          <span className="bb-cmdk__hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            to navigate
          </span>
          <span className="bb-cmdk__hint">
            <kbd>↵</kbd>
            to open
          </span>
        </div>
      </div>
    </div>
  );
}

function ComponentGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

function TokensGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
