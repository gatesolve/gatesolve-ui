import { chromium, Browser, Page } from "playwright";
import { act } from "@testing-library/react";

describe("Basic map functionality", () => {
  jest.setTimeout(180000);

  let page: Page;
  let browser: Browser;

  beforeAll(async () => {
    browser = process.env.GITHUB_ACTIONS
      ? await chromium.launch()
      : await chromium.launch({ headless: false });
    page = await browser.newPage();

    await act(async () => {
      await page
        .goto(process.env.E2E_TEST_URL || "", { waitUntil: "networkidle0" })
        .catch(() => {});
    });
  });

  afterAll(() => {
    if (!page.isClosed()) {
      browser.close();
    }
  });

  test("left-clicking changes destination", async () => {
    const clickX = 200;
    const clickY = 200;
    const mapElem = await page.$("div.mapboxgl-map");
    await act(async () => {
      await mapElem?.click({ position: { x: clickX, y: clickY } });
    });
    const destination = await page.$('[data-testid="destination"]');
    const bbox = await destination?.boundingBox();
    if (bbox) {
      // Pin points into the middle of the bottom of the bounding box.
      expect(Math.abs(clickX - (bbox.x + bbox.width / 2))).toBeLessThanOrEqual(
        1
      );
      expect(Math.abs(clickY - (bbox.y + bbox.height))).toBeLessThanOrEqual(1);
    }
  });
});
