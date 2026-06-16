import type { Browser, BrowserContext } from "playwright";

export interface TestBrowser {
  browser: Browser;
  context: BrowserContext;
}

export interface TestBrowserHandle extends TestBrowser {
  close(): Promise<void>;
}

/** Launch a shared Chromium session for headless test suites. */
export async function createTestBrowser(): Promise<TestBrowserHandle> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const context = await browser.newContext();
  return {
    browser,
    context,
    async close() {
      await context.close();
      await browser.close();
    },
  };
}

/** Open a page from a shared test browser context. */
export async function createTestPage(browser: TestBrowser) {
  return browser.context.newPage();
}
