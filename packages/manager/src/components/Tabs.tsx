import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import "./tabs.css";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  const updateScrollEdges = () => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollEdges({
      left: el.scrollLeft > 2,
      right: maxScroll > 2 && el.scrollLeft < maxScroll - 2,
    });
  };

  useLayoutEffect(() => {
    updateScrollEdges();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateScrollEdges);
    observer.observe(el);
    el.addEventListener("scroll", updateScrollEdges, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateScrollEdges);
    };
  }, [items.length]);

  useLayoutEffect(() => {
    scrollActiveTabIntoView(scrollRef, activeRef);
    updateScrollEdges();
  }, [value, items.length]);

  return (
    <div
      className={className ? `bb-tabs ${className}` : "bb-tabs"}
      data-scroll-left={scrollEdges.left ? "true" : undefined}
      data-scroll-right={scrollEdges.right ? "true" : undefined}
    >
      <div ref={scrollRef} className="bb-tabs__scroll">
        <div className="bb-tabs__list" role="tablist" aria-label={ariaLabel}>
          {items.map((item) => (
            <button
              key={item.id}
              ref={value === item.id ? activeRef : undefined}
              type="button"
              role="tab"
              aria-selected={value === item.id}
              className="bb-tabs__tab"
              data-active={value === item.id ? "true" : undefined}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function scrollActiveTabIntoView(
  scrollRef: RefObject<HTMLDivElement | null>,
  activeRef: RefObject<HTMLButtonElement | null>,
) {
  const scroll = scrollRef.current;
  const active = activeRef.current;
  if (!scroll || !active) return;

  const scrollRect = scroll.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const padding = 8;

  if (activeRect.left < scrollRect.left + padding) {
    scroll.scrollLeft -= scrollRect.left + padding - activeRect.left;
  } else if (activeRect.right > scrollRect.right - padding) {
    scroll.scrollLeft += activeRect.right - (scrollRect.right - padding);
  }
}
