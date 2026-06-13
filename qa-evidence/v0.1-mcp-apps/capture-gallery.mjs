import pkg from "/tmp/pw/node_modules/playwright-core/index.js"; const { chromium } = pkg;
import { readFileSync, mkdirSync } from "node:fs";

const EXE = "/Users/billiboss/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const DIR = "/tmp/canna-qa/mcpapps";
mkdirSync(DIR, { recursive: true });
const widgets = [
  ["member-quota-card", "Cota mensal (member-quota-card)"],
  ["dispensation-form", "Dispensacao (dispensation-form)"],
  ["traceability-timeline", "Rastreabilidade (traceability-timeline)"],
];
const browser = await chromium.launch({ headless: true, executablePath: EXE });
let n = 5; // continue numbering after the live capture (f01..f05)
for (const [slug, title] of widgets) {
  const page = await browser.newPage({ viewport: { width: 900, height: 360 } });
  await page.goto(`file:///tmp/canna-qa/${slug}.html`, { waitUntil: "load" });
  const env = JSON.parse(readFileSync(`/tmp/canna-qa/${slug}.postmessage.json`, "utf8"));
  await page.evaluate((e) => window.postMessage(e, "*"), env);
  await page.waitForTimeout(700);
  n++;
  const p = `${DIR}/f${String(n).padStart(2, "0")}-render-${slug}.png`;
  await page.screenshot({ path: p });
  console.log(`rendered ${slug}: ${title}`);
  await page.close();
}
await browser.close();
console.log("DONE gallery");
