// FIXME: We should not need to use the !. non-null assertions after the expects
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41179
/* eslint @typescript-eslint/no-non-null-assertion: 0 */
import { chromium, Browser, Page } from "playwright";
import { act } from "@testing-library/react";

describe("Basic map functionality", () => {
  jest.setTimeout(180000);

  let page: Page;
  let browser: Browser;

  beforeAll(async () => {
    // FIXME Find out why the test fails without slowMo
    browser = process.env.GITHUB_ACTIONS
      ? await chromium.launch({ slowMo: 100, headless: true })
      : await chromium.launch({ slowMo: 100, headless: false });
    page = await browser.newPage();

    await act(async () => {
      await page
        .goto(process.env.E2E_TEST_URL || "http://localhost:3000", {
          waitUntil: "networkidle",
        })
        .catch(() => {});
    });
  });

  afterAll(async () => {
    if (!page.isClosed()) {
      await browser.close();
    }
  });

  test("left-clicking changes destination", async () => {
    const clickX = 200;
    const clickY = 200;

    const appElem = await page.$(".App");
    expect(appElem).toBeTruthy();
    const mapElem = await page.$(".mapboxgl-map");
    expect(mapElem).toBeTruthy();

    await act(async () => {
      // FIXME We should click mapElem here, but that hangs
      await appElem!.click({ position: { x: clickX, y: clickY } });
    });

    const popup = await page.$('[data-testid="destination-button"]');
    expect(popup).toBeTruthy();

    await act(async () => {
      await popup!.click();
    });

    const destination = await page.$('[data-testid="destination"]');
    expect(destination).toBeTruthy();
    const bbox = await destination!.boundingBox();
    expect(bbox).toBeTruthy();

    // Pin points into the middle of the bottom of the bounding box.
    expect(Math.abs(clickX - (bbox!.x + bbox!.width / 2))).toBeLessThanOrEqual(
      1
    );
    expect(Math.abs(clickY - (bbox!.y + bbox!.height))).toBeLessThanOrEqual(1);
  });
});
