/**
 * Dev helper: captures screenshots of every screen so the UI can be compared
 * with the design.
 *
 * The Expo Router dev server has an SSR issue in SDK 58, so the script opens
 * the app on the splash screen and then drives the client side router by
 * clicking through the interface.
 *
 * Run with: node scripts/screenshots.js [baseUrl]
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = process.argv[2] || "http://localhost:8099";
const OUT_DIR = path.join(__dirname, "..", ".screenshots");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until Metro finished bundling the requested route. */
async function waitForBundle(page, timeout = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const bundling = await page.evaluate(() => document.body.innerText.includes("Bundling"));
    if (!bundling) break;
    await sleep(500);
  }
  await sleep(600);
}

/** Waits until the app actually painted something (fonts + first render). */
async function waitForContent(page, timeout = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const length = await page.evaluate(() => document.body.innerText.length);
    if (length > 0) break;
    await sleep(400);
  }
  await sleep(1200);
}

async function clickText(page, text, { exact = true, index = 0 } = {}) {
  await waitForContent(page);
  const clicked = await page.evaluate(
    ({ text, exact, index }) => {
      const candidates = Array.from(document.querySelectorAll("div,span,p,a,button"));
      const matches = candidates.filter((node) => {
        const content = (node.textContent || "").trim();
        if (exact) return content === text;
        return content.includes(text);
      });
      // Prefer the deepest element so we click the label, not the wrapper.
      const sorted = matches.sort((a, b) => {
        const depth = (node) => {
          let d = 0;
          let current = node;
          while (current) {
            d++;
            current = current.parentElement;
          }
          return d;
        };
        return depth(b) - depth(a);
      });
      const target = sorted[index];
      if (!target) return false;

      const rect = target.getBoundingClientRect();
      const options = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      target.dispatchEvent(new PointerEvent("pointerdown", options));
      target.dispatchEvent(new PointerEvent("pointerup", options));
      target.dispatchEvent(new MouseEvent("mousedown", options));
      target.dispatchEvent(new MouseEvent("mouseup", options));
      target.click();
      return true;
    },
    { text, exact, index }
  );
  if (!clicked) console.log(`  ! could not find "${text}"`);
  await sleep(900);
  await waitForBundle(page);
  return clicked;
}

async function goBack(page) {
  await waitForContent(page);
  const clicked = await page.evaluate(() => {
    const target = document.querySelector('[aria-label="Go back"]');
    if (!target) return false;
    const rect = target.getBoundingClientRect();
    const options = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    target.dispatchEvent(new PointerEvent("pointerdown", options));
    target.dispatchEvent(new PointerEvent("pointerup", options));
    target.dispatchEvent(new MouseEvent("mousedown", options));
    target.dispatchEvent(new MouseEvent("mouseup", options));
    target.click();
    return true;
  });
  if (!clicked) {
    console.log(
      "  labels:",
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("[aria-label]"))
          .map((n) => n.getAttribute("aria-label"))
          .join(", ")
      )
    );
    try {
      await page.goBack({ waitUntil: "domcontentloaded" });
    } catch {
      console.log("  ! history back failed");
    }
  }
  await sleep(900);
  await waitForBundle(page);
}

async function clickLabel(page, label) {
  await waitForContent(page);
  const clicked = await page.evaluate((label) => {
    const target = document.querySelector(`[aria-label="${label}"]`);
    if (!target) return false;
    const rect = target.getBoundingClientRect();
    const options = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    target.dispatchEvent(new PointerEvent("pointerdown", options));
    target.dispatchEvent(new PointerEvent("pointerup", options));
    target.dispatchEvent(new MouseEvent("mousedown", options));
    target.dispatchEvent(new MouseEvent("mouseup", options));
    target.click();
    return true;
  }, label);
  if (!clicked) console.log(`  ! could not find label "${label}"`);
  await sleep(900);
  await waitForBundle(page);
  return clicked;
}

async function capture(page, name) {
  await waitForContent(page);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`captured ${name}`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));

  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
  await sleep(600);
  await capture(page, "01-splash");

  // The splash screen redirects to the home screen.
  await waitForContent(page);
  await sleep(2600);
  await capture(page, "02-home");

  await clickText(page, "See all", { exact: false, index: 0 });
  await capture(page, "03-hourly");
  await goBack(page);

  await clickText(page, "See all", { exact: false, index: 1 });
  await capture(page, "04-daily");
  await goBack(page);

  await clickText(page, "Weather details", { exact: false });
  await capture(page, "06-details");
  await goBack(page);

  await clickLabel(page, "Search");
  await capture(page, "05-search");

  await clickLabel(page, "Map");
  await sleep(4000);
  await capture(page, "09-map");

  await clickLabel(page, "Cities");
  await sleep(2500);
  await capture(page, "07-cities");

  await clickLabel(page, "Settings");
  await capture(page, "08-settings");

  await browser.close();
})();
