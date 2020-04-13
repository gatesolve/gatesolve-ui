// FIXME: We should not need to use the !. non-null assertions after the expects
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41179
/* eslint @typescript-eslint/no-non-null-assertion: 0 */
import { webkit, devices, Browser, Page } from "playwright";
import { act } from "@testing-library/react";

describe("Geolocation", () => {
  jest.setTimeout(180000);

  const iPhone11 = devices["iPhone 11 Pro"];

  let page: Page;
  let browser: Browser;

  beforeAll(async () => {
    // FIXME Find out why the test fails without slowMo
    browser = process.env.GITHUB_ACTIONS
      ? await webkit.launch({ slowMo: 0, headless: true })
      : await webkit.launch({ slowMo: 0, headless: false });
  });

  beforeEach(async () => {
    const context = await browser.newContext({
      ...iPhone11,
      geolocation: { longitude: 24.95002, latitude: 60.16548 },
      permissions: ["geolocation"],
    });
    page = await context.newPage();
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

  test("clicking geolocation button turns geolocation on", async () => {
    const geolocationButton = await page.$("button[title=Geolocate]");
    expect(geolocationButton).toBeTruthy();
    const isPressedBefore = await geolocationButton!.getAttribute(
      "aria-pressed"
    );
    expect(isPressedBefore).toEqual("false");
    await geolocationButton!.click();
    const isPressedAfter = await geolocationButton!.getAttribute(
      "aria-pressed"
    );
    expect(isPressedAfter).toEqual("true");
  });

  test("clicking geolocation button does not click the map behind it", async () => {
    await page.$("data-testid=app");
    expect(false).toBeTruthy();
  });

  test("origin updates when geolocation position updates", async () => {
    await page.$("data-testid=app");
    expect(false).toBeTruthy();
  });
});
