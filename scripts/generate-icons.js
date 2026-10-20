/**
 * Generates the app icon, splash icon, favicon and Android adaptive icons
 * from the brand artwork in `scripts/assets`.
 *
 * Run with: node scripts/generate-icons.js
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const MARK = fs.readFileSync(path.join(__dirname, "assets", "weatherly-mark.svg"), "utf8");

const MARK_ONLY = MARK;

function page(body, background) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:100%;height:100%;}
    body{background:${background};display:flex;align-items:center;justify-content:center;overflow:hidden;}
    svg{display:block;}
  </style></head><body>${body}</body></html>`;
}

const TARGETS = [
  {
    file: path.join(ASSETS, "images", "icon.png"),
    width: 1024,
    height: 1024,
    transparent: false,
    html: page(
      `<div style="width:1024px;height:1024px;background:linear-gradient(160deg,#4BA3F0 0%,#2F8AE5 55%,#1F6FCB 100%);display:flex;align-items:center;justify-content:center;border-radius:230px;">
         <div style="transform:scale(4.2) translateY(6px);">${MARK_ONLY}</div>
       </div>`,
      "transparent"
    ),
  },
  {
    file: path.join(ASSETS, "images", "splash-icon.png"),
    width: 256,
    height: 256,
    transparent: true,
    html: page(
      `<div style="transform:scale(2.1) translateY(8px);">${MARK_ONLY}</div>`,
      "transparent"
    ),
  },
  {
    file: path.join(ASSETS, "images", "favicon.png"),
    width: 96,
    height: 96,
    transparent: true,
    html: page(
      `<div style="transform:scale(0.78) translateY(4px);">${MARK_ONLY}</div>`,
      "transparent"
    ),
  },
  {
    file: path.join(ASSETS, "images", "android-icon-foreground.png"),
    width: 512,
    height: 512,
    transparent: true,
    html: page(
      `<div style="transform:scale(1.55) translateY(8px);">${MARK_ONLY}</div>`,
      "transparent"
    ),
  },
  {
    file: path.join(ASSETS, "images", "android-icon-background.png"),
    width: 512,
    height: 512,
    transparent: false,
    html: page(
      `<div style="width:512px;height:512px;background:linear-gradient(160deg,#4BA3F0 0%,#1F6FCB 100%);"></div>`,
      "transparent"
    ),
  },
  {
    file: path.join(ASSETS, "images", "android-icon-monochrome.png"),
    width: 432,
    height: 432,
    transparent: true,
    html: page(
      `<div style="transform:scale(1.3) translateY(6px);filter:brightness(0) invert(1);">${MARK_ONLY}</div>`,
      "transparent"
    ),
  },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });

  for (const target of TARGETS) {
    const pageHandle = await browser.newPage();
    await pageHandle.setViewport({
      width: target.width,
      height: target.height,
      deviceScaleFactor: 1,
    });
    await pageHandle.setContent(target.html, { waitUntil: "load" });
    await pageHandle.screenshot({
      path: target.file,
      omitBackground: target.transparent,
    });
    await pageHandle.close();
    console.log(`generated ${path.relative(ROOT, target.file)}`);
  }

  await browser.close();
})();
