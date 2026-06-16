import type { Page } from "playwright";

/** The preview's rendered component root (always present on the canvas). */
export const ROOT_SELECTOR = "[data-tidex-visual]";

/** Load a story and wait for the component root to render and settle. */
export async function gotoStory(page: Page, url: string): Promise<boolean> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  try {
    await page.locator(ROOT_SELECTOR).first().waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return false;
  }
  await page.evaluate(() => document.fonts.ready);
  return true;
}
