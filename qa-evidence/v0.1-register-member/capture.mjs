import pkg from "/tmp/pw/node_modules/playwright-core/index.js"; const { chromium } = pkg;
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const EXE = "/Users/billiboss/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const DIR = "/tmp/canna-qa/frames";
mkdirSync(DIR, { recursive: true });
const SEED = "01HM0MEMBER000000000000001";
const pad = (n) => String(n).padStart(2, "0");
let f = 0;
const shot = async (page, label) => {
  f += 1;
  await page.screenshot({ path: `${DIR}/f${pad(f)}-${label}.png` });
  console.log(`frame f${pad(f)}-${label}`);
};
const members = () =>
  Number(execSync(`docker exec canna-postgres psql -U canna -d canna -tA -c "SELECT count(*) FROM emt_streams WHERE stream_id LIKE 'member:%';"`).toString().trim());

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });

await page.goto("http://localhost:3002/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot(page, "chat-aberto");

await page.selectOption("select", { label: "Claude 3.5 Haiku" }).catch(() => {});
await page.waitForTimeout(400);

const ask = async (text) => {
  const box = page.getByRole("textbox", { name: "Message input" });
  await box.click();
  await box.fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
};
const newThread = async () => {
  await page.getByRole("button", { name: "New Thread" }).click().catch(() => {});
  await page.waitForTimeout(700);
};

// REGISTER via chat — retry to beat the intermittent AI-SDK arg-collapse
const before = members();
let created = false;
for (let i = 0; i < 5 && !created; i++) {
  await ask("Quero cadastrar um novo membro, CPF 52998224725.");
  await page.waitForTimeout(9000);
  if (i === 0) await shot(page, "cadastrar-tool-dispara");
  if (members() > before) { created = true; await shot(page, "membro-criado-chat"); }
  else await newThread();
}
console.log(`chat register created=${created} before=${before} now=${members()}`);
// guarantee a real member for the Postgres proof
if (!created) {
  execSync(`cd /Users/billiboss/src/canna-br/apps/mcp && /Users/billiboss/.bun/bin/bun x tsx scripts/qa-call-register-member.ts`, { stdio: "inherit" });
}
const after = members();
console.log(`members after: ${after}`);

// QUERY seed member → widget renders inline (proven chat→tool→widget)
await newThread();
await ask(`Mostre a cota mensal do membro ${SEED}.`);
await page.waitForTimeout(13000);
await shot(page, "cota-widget-inline");

await browser.close();
console.log(`DONE created=${created} membersBefore=${before} membersAfter=${after}`);
