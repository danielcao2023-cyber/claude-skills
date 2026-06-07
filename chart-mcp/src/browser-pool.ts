import puppeteer, { Browser, Page } from "puppeteer";

let browser: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  if (!launchPromise) {
    launchPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
      ],
    });
  }
  browser = await launchPromise;
  return browser;
}

export async function newPage(): Promise<Page> {
  const b = await getBrowser();
  return b.newPage();
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    launchPromise = null;
  }
}

export async function renderWithRetry(
  renderFn: (page: Page) => Promise<Buffer>,
): Promise<Buffer> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const page = await newPage();
    try {
      page.setDefaultTimeout(15000);
      const result = await renderFn(page);
      return result;
    } catch (e) {
      lastErr = e as Error;
      if (attempt === 0) {
        await closeBrowser();
      }
    } finally {
      await page.close().catch(() => {});
    }
  }
  throw new Error(`Render failed after 2 attempts: ${lastErr?.message}`);
}
