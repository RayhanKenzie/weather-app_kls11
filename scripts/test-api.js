/**
 * End-to-end check of the Open-Meteo integration.
 *
 * The script intercepts the network request in the browser and answers it with
 * a fixture that mimics the real API payload, then verifies that the app
 * renders the parsed values.
 *
 * Run with: node scripts/test-api.js [baseUrl]
 */
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = process.argv[2] || "http://localhost:8099";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildFixture() {
  const hourly = {
    time: [],
    temperature_2m: [],
    weather_code: [],
    precipitation_probability: [],
    relative_humidity_2m: [],
    wind_speed_10m: [],
    is_day: [],
  };

  for (let i = 0; i < 24; i++) {
    const hour = String((10 + i) % 24).padStart(2, "0");
    hourly.time.push(`2026-10-20T${hour}:00`);
    hourly.temperature_2m.push(28 + Math.round(Math.sin(i / 3) * 3));
    hourly.weather_code.push([2, 2, 1, 0, 3, 61, 80][i % 7]);
    hourly.precipitation_probability.push([10, 20, 35, 5, 45, 60, 25][i % 7]);
    hourly.relative_humidity_2m.push(70 + (i % 10));
    hourly.wind_speed_10m.push(8 + (i % 6));
    hourly.is_day.push(i % 24 < 12 ? 1 : 0);
  }

  const daily = {
    time: [],
    weather_code: [],
    temperature_2m_max: [],
    temperature_2m_min: [],
    sunrise: [],
    sunset: [],
    precipitation_probability_max: [],
    wind_speed_10m_max: [],
    uv_index_max: [],
  };

  for (let i = 0; i < 7; i++) {
    daily.time.push(`2026-10-${20 + i}`);
    daily.weather_code.push([2, 0, 61, 3, 80, 95, 1][i]);
    daily.temperature_2m_max.push(30 + i);
    daily.temperature_2m_min.push(24 - i);
    daily.sunrise.push(`2026-10-${20 + i}T05:45`);
    daily.sunset.push(`2026-10-${20 + i}T18:05`);
    daily.precipitation_probability_max.push([10, 20, 55, 30, 70, 80, 15][i]);
    daily.wind_speed_10m_max.push([9, 12, 14, 10, 16, 18, 11][i]);
    daily.uv_index_max.push([6, 7, 5, 8, 4, 3, 6][i]);
  }

  return {
    latitude: -6.2088,
    longitude: 106.8456,
    timezone: "Asia/Jakarta",
    utc_offset_seconds: 25200,
    current: {
      time: "2026-10-20T11:00",
      interval: 900,
      temperature_2m: 28.4,
      relative_humidity_2m: 78,
      apparent_temperature: 30.1,
      is_day: 1,
      precipitation: 0.2,
      weather_code: 2,
      cloud_cover: 45,
      surface_pressure: 1012.4,
      wind_speed_10m: 12.3,
      wind_direction_10m: 210,
    },
    hourly,
    daily,
  };
}

const EXPECTED = [
  { text: "28°", label: "current temperature" },
  { text: "Partly cloudy", label: "weather condition (WMO 2)" },
  { text: "30°", label: "apparent temperature" },
  { text: "05:45", label: "sunrise" },
  { text: "12 km/h", label: "wind speed" },
];

async function clickText(page, text) {
  const clicked = await page.evaluate((text) => {
    const nodes = Array.from(document.querySelectorAll("div,span,p,a,button"));
    const target = nodes
      .filter((node) => (node.textContent || "").trim().includes(text))
      .sort((a, b) => {
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
      })[0];
    if (!target) return false;
    target.click();
    return true;
  }, text);
  await sleep(1500);
  return clicked;
}

(async () => {
  const fixture = buildFixture();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

  // Only the Open-Meteo calls are faked, everything else stays untouched.
  if (!process.env.SKIP_FETCH) {
    await page.evaluateOnNewDocument((fixture) => {
      const originalFetch = window.fetch.bind(window);
      const json = (payload) =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input?.url ?? "";
        if (url.includes("api.open-meteo.com/v1/forecast")) {
          return json(fixture);
        }
        if (url.includes("geocoding-api.open-meteo.com")) {
          return json({ results: [] });
        }
        return originalFetch(input, init);
      };
    }, fixture);
  }

  page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.log("CONSOLE:", message.text());
  });

  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });

  // Wait until the app painted the home screen (fonts + first render).
  const started = Date.now();
  while (Date.now() - started < 60000) {
    const length = await page.evaluate(() => document.body.innerText.length);
    if (length > 0) break;
    await sleep(400);
  }
  await sleep(2600);

  if (process.env.DEBUG) {
    await page.screenshot({ path: path.join(__dirname, "..", ".screenshots", "api-test.png") });
    console.log("url:", page.url());
  }

  const content = await page.evaluate(() => document.body.innerText);
  let failures = 0;

  if (process.env.DEBUG) {
    console.log("--- page content ---");
    console.log(content);
    console.log("---------------------");
  }

  for (const expectation of EXPECTED) {
    if (content.includes(expectation.text)) {
      console.log(`  ok  ${expectation.label} → "${expectation.text}"`);
    } else {
      failures++;
      console.log(`  FAIL ${expectation.label} → "${expectation.text}" not found`);
    }
  }

  if (content.includes("Offline data")) {
    failures++;
    console.log("  FAIL app fell back to the offline dataset");
  } else {
    console.log("  ok  app used the live payload");
  }

  // The details screen shows the remaining parsed values.
  if (await clickText(page, "Weather details")) {
    const details = await page.evaluate(() => document.body.innerText);
    const detailChecks = [
      { text: "18:05", label: "sunset" },
      { text: "1012 hPa", label: "surface pressure" },
      { text: "78%", label: "humidity" },
    ];
    for (const check of detailChecks) {
      if (details.includes(check.text)) {
        console.log(`  ok  ${check.label} → "${check.text}"`);
      } else {
        failures++;
        console.log(`  FAIL ${check.label} → "${check.text}" not found`);
      }
    }
  } else {
    failures++;
    console.log("  FAIL could not open the details screen");
  }

  await browser.close();
  console.log(failures === 0 ? "\nAPI integration: PASS" : `\nAPI integration: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})();
