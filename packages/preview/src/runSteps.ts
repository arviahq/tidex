import { within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import type { InteractionStep, StepResult, StepTarget } from "@tide/core";

/** Human-readable description of a target, for result messages. */
function describe(target: StepTarget): string {
  return target.name
    ? `${target.by}=${target.value} (name: ${target.name})`
    : `${target.by}=${target.value}`;
}

/** Locate the element a step targets, scoped to the rendered component root. */
function resolve(root: HTMLElement, target: StepTarget): HTMLElement | null {
  const scope = within(root);
  switch (target.by) {
    case "role":
      return scope.queryByRole(
        target.value,
        target.name ? { name: target.name } : undefined,
      ) as HTMLElement | null;
    case "text":
      return scope.queryByText(target.value) as HTMLElement | null;
    case "testid":
      return scope.queryByTestId(target.value) as HTMLElement | null;
    case "css":
      return root.querySelector<HTMLElement>(target.value);
    default:
      return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(
  el: HTMLElement | null,
  step: Extract<InteractionStep, { type: "assert" }>,
): StepResult["message"] | null {
  const desc = describe(step.target);
  switch (step.matcher) {
    case "exists":
      return el ? null : `Expected ${desc} to exist`;
    case "absent":
      return el ? `Expected ${desc} to be absent, but it exists` : null;
    case "text": {
      if (!el) return `Expected ${desc} to exist`;
      const text = el.textContent ?? "";
      const expected = String(step.expected ?? "");
      return text.includes(expected)
        ? null
        : `Expected text to contain "${expected}", got "${text}"`;
    }
    case "value": {
      if (!el) return `Expected ${desc} to exist`;
      const value = (el as HTMLInputElement).value ?? "";
      const expected = String(step.expected ?? "");
      return value === expected ? null : `Expected value "${expected}", got "${value}"`;
    }
    case "checked": {
      if (!el) return `Expected ${desc} to exist`;
      const checked = (el as HTMLInputElement).checked;
      const expected = step.expected === undefined ? true : Boolean(step.expected);
      return checked === expected ? null : `Expected checked=${expected}, got ${checked}`;
    }
    case "disabled": {
      if (!el) return `Expected ${desc} to exist`;
      const disabled =
        (el as HTMLInputElement).disabled || el.getAttribute("aria-disabled") === "true";
      const expected = step.expected === undefined ? true : Boolean(step.expected);
      return disabled === expected ? null : `Expected disabled=${expected}, got ${disabled}`;
    }
    default:
      return `Unknown matcher`;
  }
}

async function runStep(
  root: HTMLElement,
  step: InteractionStep,
  index: number,
  user: ReturnType<typeof userEvent.setup>,
): Promise<StepResult> {
  switch (step.type) {
    case "wait":
      await delay(step.ms);
      return { index, ok: true };
    case "click": {
      const el = resolve(root, step.target);
      if (!el) return { index, ok: false, message: `No element for ${describe(step.target)}` };
      await user.click(el);
      return { index, ok: true };
    }
    case "type": {
      const el = resolve(root, step.target);
      if (!el) return { index, ok: false, message: `No element for ${describe(step.target)}` };
      await user.clear(el);
      if (step.value) await user.type(el, step.value);
      return { index, ok: true };
    }
    case "assert": {
      const el = resolve(root, step.target);
      const message = assert(el, step);
      return message ? { index, ok: false, message } : { index, ok: true };
    }
    default:
      return { index, ok: false, message: "Unknown step type" };
  }
}

/**
 * Run interaction steps against the rendered component DOM, emitting each
 * step's result as it completes. Stops at the first failing step.
 */
export async function runSteps(
  root: HTMLElement,
  steps: InteractionStep[],
  emit: (result: StepResult) => void,
): Promise<boolean> {
  const user = userEvent.setup();
  let allOk = true;
  for (let i = 0; i < steps.length; i++) {
    let result: StepResult;
    try {
      result = await runStep(root, steps[i]!, i, user);
    } catch (err) {
      result = { index: i, ok: false, message: err instanceof Error ? err.message : String(err) };
    }
    emit(result);
    if (!result.ok) {
      allOk = false;
      break;
    }
  }
  return allOk;
}
