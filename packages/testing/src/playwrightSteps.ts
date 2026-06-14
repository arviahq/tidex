import type { Locator, Page } from "playwright";
import type { InteractionStep, StepResult, StepTarget } from "@tide/core";

const TIMEOUT = 3000;

function locate(page: Page, target: StepTarget): Locator {
  switch (target.by) {
    case "role":
      return page.getByRole(
        target.value as Parameters<Page["getByRole"]>[0],
        target.name ? { name: target.name } : undefined,
      );
    case "text":
      return page.getByText(target.value);
    case "testid":
      return page.getByTestId(target.value);
    case "css":
      return page.locator(target.value);
  }
}

function describe(target: StepTarget): string {
  return target.name
    ? `${target.by}=${target.value} (name: ${target.name})`
    : `${target.by}=${target.value}`;
}

async function runOne(page: Page, step: InteractionStep, index: number): Promise<StepResult> {
  if (step.type === "wait") {
    await page.waitForTimeout(step.ms);
    return { index, ok: true };
  }

  const loc = locate(page, step.target).first();

  switch (step.type) {
    case "click":
      await loc.click({ timeout: TIMEOUT });
      return { index, ok: true };
    case "type":
      await loc.fill("", { timeout: TIMEOUT });
      if (step.value) await loc.fill(step.value, { timeout: TIMEOUT });
      return { index, ok: true };
    case "assert": {
      const all = locate(page, step.target);
      switch (step.matcher) {
        case "exists":
          return (await all.count()) > 0
            ? { index, ok: true }
            : { index, ok: false, message: `Expected ${describe(step.target)} to exist` };
        case "absent":
          return (await all.count()) === 0
            ? { index, ok: true }
            : { index, ok: false, message: `Expected ${describe(step.target)} to be absent` };
        case "text": {
          const text = (await loc.textContent({ timeout: TIMEOUT })) ?? "";
          const expected = String(step.expected ?? "");
          return text.includes(expected)
            ? { index, ok: true }
            : {
                index,
                ok: false,
                message: `Expected text to contain "${expected}", got "${text}"`,
              };
        }
        case "value": {
          const value = await loc.inputValue({ timeout: TIMEOUT });
          const expected = String(step.expected ?? "");
          return value === expected
            ? { index, ok: true }
            : { index, ok: false, message: `Expected value "${expected}", got "${value}"` };
        }
        case "checked": {
          const checked = await loc.isChecked({ timeout: TIMEOUT });
          const expected = step.expected === undefined ? true : Boolean(step.expected);
          return checked === expected
            ? { index, ok: true }
            : { index, ok: false, message: `Expected checked=${expected}, got ${checked}` };
        }
        case "disabled": {
          const disabled = !(await loc.isEnabled({ timeout: TIMEOUT }));
          const expected = step.expected === undefined ? true : Boolean(step.expected);
          return disabled === expected
            ? { index, ok: true }
            : { index, ok: false, message: `Expected disabled=${expected}, got ${disabled}` };
        }
      }
    }
  }

  return { index, ok: false, message: "Unknown step type" };
}

/** Drive interaction steps against a Playwright page, stopping at the first failure. */
export async function runStepsPlaywright(
  page: Page,
  steps: InteractionStep[],
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  for (let i = 0; i < steps.length; i++) {
    try {
      const result = await runOne(page, steps[i]!, i);
      results.push(result);
      if (!result.ok) break;
    } catch (err) {
      results.push({
        index: i,
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
      break;
    }
  }
  return results;
}
