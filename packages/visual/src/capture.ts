import type { Page } from "playwright";
import {
  CURATED_STYLE_PROPS,
  filterAttrs,
  VISUAL_SNAPSHOT_VERSION,
  type DomNode,
  type LayoutBox,
  type StyleMap,
  type VisualSnapshot,
} from "./snapshot-types.js";
import { VISUAL_DEVICE_SCALE_FACTOR, VISUAL_SELECTOR, VISUAL_VIEWPORT } from "./engine.js";

export interface CaptureOptions {
  page: Page;
  url: string;
  componentId: string;
  args?: Record<string, unknown>;
  theme?: "light" | "dark";
  /** ISO timestamp for snapshot meta (caller supplies — keeps capture deterministic). */
  capturedAt?: string;
}

export interface CaptureResult {
  screenshot: Buffer;
  /** screenshotPath is left unset here; the engine fills it when it writes the PNG. */
  snapshot: VisualSnapshot;
}

/** Freeze animations/transitions, hide carets — kills the main screenshot flakiness sources. */
const DETERMINISM_CSS = `*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}`;

/** Shape returned by the in-page walker (raw attrs, unsorted classes). */
interface RawWalkResult {
  dom: Array<{
    key: string;
    tag: string;
    attrs?: Record<string, string>;
    classes?: string[];
    text?: string;
  }>;
  styles: Record<string, StyleMap>;
  layout: Record<string, LayoutBox>;
}

/**
 * Capture all structured layers + the screenshot in a single page load and a single
 * DOM traversal. Reuses the same Playwright page the screenshot flow already uses.
 */
export async function captureComponent(opts: CaptureOptions): Promise<CaptureResult> {
  const { page, url, componentId, args, theme, capturedAt } = opts;

  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: DETERMINISM_CSS });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);

  const locator = page.locator(VISUAL_SELECTOR);
  await locator.waitFor({ state: "visible", timeout: 10_000 });

  const raw = (await page.evaluate(walkInPage, {
    props: [...CURATED_STYLE_PROPS],
    selector: VISUAL_SELECTOR,
  })) as RawWalkResult;

  // Normalize raw nodes (filter volatile attrs, sort classes) on the Node side so
  // filterAttrs stays the single, testable source of truth.
  const dom: DomNode[] = raw.dom.map((n) => {
    if (n.tag === "#text") return { key: n.key, tag: "#text", text: n.text };
    const node: DomNode = { key: n.key, tag: n.tag };
    const attrs = n.attrs ? filterAttrs(n.attrs) : {};
    if (Object.keys(attrs).length > 0) node.attrs = attrs;
    if (n.classes && n.classes.length > 0) node.classes = [...n.classes].sort();
    return node;
  });

  // Accessibility via the supported aria-snapshot (role/name/state YAML); diffed by line.
  let a11y: string | null = null;
  try {
    a11y = await locator.ariaSnapshot();
  } catch {
    a11y = null;
  }

  const screenshot = await locator.screenshot({ type: "png", scale: "device" });

  const snapshot: VisualSnapshot = {
    meta: {
      version: VISUAL_SNAPSHOT_VERSION,
      componentId,
      args,
      theme,
      viewport: {
        width: VISUAL_VIEWPORT.width,
        height: VISUAL_VIEWPORT.height,
        dpr: VISUAL_DEVICE_SCALE_FACTOR,
      },
      capturedAt: capturedAt ?? "",
    },
    dom,
    styles: raw.styles,
    layout: raw.layout,
    a11y,
  };

  return { screenshot, snapshot };
}

/**
 * Runs IN THE BROWSER (serialized by page.evaluate — must be self-contained).
 * One pre-order DFS over the captured element: one getComputedStyle + one
 * getBoundingClientRect per element, geometry normalized against the root rect.
 */
function walkInPage(arg: { props: string[]; selector: string }): RawWalkResult {
  const { props, selector } = arg;
  const dom: RawWalkResult["dom"] = [];
  const styles: Record<string, StyleMap> = {};
  const layout: Record<string, LayoutBox> = {};

  const root = document.querySelector(selector);
  if (!root) return { dom, styles, layout };
  const rootRect = root.getBoundingClientRect();
  const round = (n: number) => Math.round(n);
  const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
  const childKey = (parent: string, i: number) => (parent === "" ? String(i) : `${parent}/${i}`);

  const visit = (el: Element, key: string) => {
    const attrs: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
    const classes = el.classList.length > 0 ? Array.from(el.classList) : undefined;
    dom.push({ key, tag: el.tagName.toLowerCase(), attrs, classes });

    const cs = getComputedStyle(el);
    const sm: StyleMap = {};
    for (const p of props) sm[p] = cs.getPropertyValue(p);
    styles[key] = sm;

    const r = el.getBoundingClientRect();
    layout[key] = {
      x: round(r.left - rootRect.left),
      y: round(r.top - rootRect.top),
      w: round(r.width),
      h: round(r.height),
      margin: `${cs.getPropertyValue("margin-top")} ${cs.getPropertyValue("margin-right")} ${cs.getPropertyValue("margin-bottom")} ${cs.getPropertyValue("margin-left")}`,
      border: `${cs.getPropertyValue("border-top-width")} ${cs.getPropertyValue("border-right-width")} ${cs.getPropertyValue("border-bottom-width")} ${cs.getPropertyValue("border-left-width")}`,
      padding: `${cs.getPropertyValue("padding-top")} ${cs.getPropertyValue("padding-right")} ${cs.getPropertyValue("padding-bottom")} ${cs.getPropertyValue("padding-left")}`,
    };

    // Keep elements + non-whitespace text; skip comments/whitespace consistently so
    // sibling indices stay stable across captures.
    let i = 0;
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 1) {
        visit(child as Element, childKey(key, i));
        i++;
      } else if (child.nodeType === 3) {
        const t = collapse(child.textContent ?? "");
        if (t) {
          dom.push({ key: childKey(key, i), tag: "#text", text: t });
          i++;
        }
      }
    }
  };

  visit(root, "");
  return { dom, styles, layout };
}
