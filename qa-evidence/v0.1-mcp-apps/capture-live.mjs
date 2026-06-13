import pkg from "/tmp/pw/node_modules/playwright-core/index.js"; const { chromium } = pkg;
import { mkdirSync } from "node:fs";

const EXE = "/Users/billiboss/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const DIR = "/tmp/canna-qa/mcpapps";
mkdirSync(DIR, { recursive: true });
const M = "01HM0MEMBER000000000000001", L = "01HM0LOT00000000000000001", D = "01HM0DISP0000000000000001";
const pad = (n) => String(n).padStart(2, "0");
let f = 0;
const shot = async (page, label) => { f++; await page.screenshot({ path: `${DIR}/f${pad(f)}-${label}.png` }); console.log(`frame f${pad(f)}-${label} iframes=${page.frames().length}`); };

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto("http://localhost:3002/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.selectOption("select", { label: "Claude 3.5 Haiku" }).catch(() => {});
await page.waitForTimeout(400);
await shot(page, "00-home");

const ask = async (t) => {
  const box = page.getByRole("textbox", { name: "Message input" });
  await box.click(); await box.fill(t);
  await page.getByRole("button", { name: "Send message" }).click();
};
const newThread = async () => { await page.getByRole("button", { name: "New Thread" }).click().catch(()=>{}); await page.waitForTimeout(700); };
const hasWidget = () => page.frames().length > 1; // an MCP App iframe mounted

// 1. member-quota-card — retry until iframe renders (reliable single-arg)
let ok1 = false;
for (let i = 0; i < 5 && !ok1; i++) {
  await ask(`Mostre a cota mensal do membro ${M}.`);
  await page.waitForTimeout(12000);
  if (hasWidget()) { ok1 = true; await shot(page, "quota-card-inline"); } else await newThread();
}
console.log("quota-card rendered:", ok1);

// 2. traceability-timeline — single dispensationId arg
await newThread();
await ask(`Mostre a rastreabilidade da dispensacao ${D}.`);
await page.waitForTimeout(12000);
await shot(page, "traceability-timeline");

// 3. dispensation-form — multi-arg (arg-collapse risk; capture honest state)
await newThread();
await ask(`Simule uma dispensacao de 5g para o membro ${M} do lote ${L}.`);
await page.waitForTimeout(12000);
await shot(page, "dispensation-form");

// 4. member-lifecycle-board — withheld (__unavailable__); capture honest response
await newThread();
await ask(`Mostre o quadro de ciclo de vida dos membros (lifecycle board).`);
await page.waitForTimeout(11000);
await shot(page, "lifecycle-board-unavailable");

await browser.close();
console.log("DONE");
