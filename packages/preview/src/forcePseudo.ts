/**
 * Force CSS pseudo-states (`:hover` / `:focus` / `:active`) on without real
 * pointer/focus interaction — the way a designer inspects a component's states.
 *
 * A plain iframe can't drive native pseudo-states (that needs CDP), so we do the
 * userland trick: clone every matching style rule with the target pseudo-class
 * stripped out, scoped under a `:where()` so specificity is unchanged, and let
 * source order make the always-on copy win. Only same-origin sheets are
 * readable — preview styles are served by Vite, so that's all of them.
 */
export type ForcedStates = { hover: boolean; focus: boolean; active: boolean };

const STYLE_ID = "tidex-forced-states";

// Each toggle expands to the pseudo-classes it should pin on.
const EXPAND: Record<keyof ForcedStates, string[]> = {
  hover: ["hover"],
  focus: ["focus", "focus-visible", "focus-within"],
  active: ["active"],
};

function pinnedSelector(selectorText: string, pseudos: string[]): string | null {
  // Skip functional pseudos that wrap the target (e.g. `:not(:hover)`) — naive
  // stripping there would invert meaning. Only pin "bare" pseudo usages.
  let matched = false;
  let next = selectorText;
  for (const p of pseudos) {
    const bare = new RegExp(`(?<!\\()\\b:${p}\\b(?!\\s*\\()`, "g");
    if (bare.test(next)) {
      matched = true;
      next = next.replace(bare, "");
    }
  }
  if (!matched) return null;
  // Keep specificity identical to the original so the pinned copy only beats the
  // base rule via source order, never overriding unrelated rules.
  return next
    .split(",")
    .map((s) => `:where(html) ${s.trim()}`)
    .join(", ");
}

function collect(rules: CSSRuleList, pseudos: string[], out: string[]): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      const sel = pinnedSelector(rule.selectorText, pseudos);
      if (sel) out.push(`${sel} { ${rule.style.cssText} }`);
    } else if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
      const inner: string[] = [];
      collect(rule.cssRules, pseudos, inner);
      if (inner.length) out.push(`@media ${rule.conditionText} { ${inner.join("\n")} }`);
    }
  }
}

export function applyForcedStates(states: ForcedStates): void {
  const existing = document.getElementById(STYLE_ID);
  const pseudos = (Object.keys(EXPAND) as Array<keyof ForcedStates>)
    .filter((k) => states[k])
    .flatMap((k) => EXPAND[k]);

  if (pseudos.length === 0) {
    existing?.remove();
    return;
  }

  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.ownerNode instanceof Element && sheet.ownerNode.id === STYLE_ID) continue;
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet — unreadable, skip
    }
    if (rules) collect(rules, pseudos, out);
  }

  const style = (existing as HTMLStyleElement | null) ?? document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = out.join("\n");
  if (!existing) document.head.appendChild(style);
}
