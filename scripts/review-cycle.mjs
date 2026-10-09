// Product review cycle for citysignal.
// Verifies UI-level behavior the build cannot catch: real API results render,
// search works end to end, honest provenance badges show, and the console is
// clean, at desktop and mobile viewports. Run against a production build:
//
//   npm run build && (npx next start -p 3105 &) && sleep 6 && node scripts/review-cycle.mjs
//
// Exits non-zero on any failed check. Screenshots land in /tmp/cs-review.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.REVIEW_BASE || "http://localhost:3105";
const OUT = "/tmp/cs-review";
mkdirSync(OUT, { recursive: true });

function parseProxy(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const proxy = { server: `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`, bypass: "localhost,127.0.0.1" };
    if (u.username) proxy.username = decodeURIComponent(u.username);
    if (u.password) proxy.password = decodeURIComponent(u.password);
    return proxy;
  } catch { return null; }
}
const proxy = parseProxy(process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy) ?? undefined;

let failures = 0;
const errors = [];
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name}${detail ? " -- " + detail : ""}`); }
}

const browser = await chromium.launch();

async function newPage(viewport, section) {
  const context = await browser.newContext({ viewport, ...(proxy ? { proxy } : {}) });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[${section} ${viewport.width}x${viewport.height}] console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[${section} ${viewport.width}x${viewport.height}] pageerror: ${err.message}`));
  return { context, page };
}

async function runSearch(page) {
  await page.getByRole("button", { name: /Search permits/i }).click();
  await page.waitForSelector("text=/matching permits|No permits match/", { timeout: 30000 });
  await page.waitForTimeout(800);
}

// ---------- API contract checks (no browser needed) ----------
{
  const r1 = await fetch(`${BASE}/api/v1/permits?postal_code=M5V&status=active&limit=5`);
  const j1 = await r1.json();
  check("api permits 200", r1.status === 200, String(r1.status));
  check("api returns normalized records", Array.isArray(j1.data) && j1.data.length > 0 && j1.data[0].id && j1.data[0].address && j1.data[0].source, JSON.stringify(j1.data?.[0]).slice(0, 160));
  check("api provenance present", j1.meta?.provenance?.dataset === "building-permits-active-permits", JSON.stringify(j1.meta?.provenance).slice(0, 160));
  check("api postal filter honest", j1.data.every((d) => d.address.includes("M5V") || d.address === "Address not listed"), "non-M5V record returned");

  const firstId = j1.data[0].id;
  const r2 = await fetch(`${BASE}/api/v1/permits/${encodeURIComponent(firstId)}`);
  check("api single permit 200", r2.status === 200, String(r2.status));
  const r3 = await fetch(`${BASE}/api/v1/permits/NOPE-NOT-REAL-123`);
  check("api unknown id 404", r3.status === 404, String(r3.status));
  const r4 = await fetch(`${BASE}/api/v1/permits?limit=500`);
  check("api bad limit 400", r4.status === 400, String(r4.status));
  const r5 = await fetch(`${BASE}/api/openapi.json`);
  const j5 = await r5.json();
  check("api openapi 3.1", r5.status === 200 && j5.openapi === "3.1.0", j5.openapi);
}

// ---------- Desktop ----------
{
  const { context, page } = await newPage({ width: 1440, height: 900 }, "desktop");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "p2-hero-desktop.png") });

  await runSearch(page);
  const cardCount = await page.locator("article").count();
  check("desktop search renders cards", cardCount > 0, `cards=${cardCount}`);
  const firstAddr = await page.locator("article h3").first().innerText();
  check("desktop card shows M5V address", /M5V/i.test(firstAddr), firstAddr.slice(0, 60));
  const badge = await page.getByText(/Fresh from source|Live query against/).first().count();
  check("desktop provenance badge visible", badge > 0);
  await page.screenshot({ path: join(OUT, "p2-results-desktop.png") });

  // List view toggle
  await page.getByRole("button", { name: /^list$/i }).click();
  await page.waitForTimeout(400);
  const rows = await page.locator("article").count();
  check("desktop list view toggles", rows === 0, `articles still present: ${rows}`);
  await page.screenshot({ path: join(OUT, "p2-list-desktop.png") });

  // Street-name search path (page is in list view; check section text)
  await page.fill('input[aria-label="Postal code or street name"]', "King");
  await runSearch(page);
  const kingText = await page.locator("section").nth(1).innerText().catch(() => "");
  check("desktop street search works", /king/i.test(kingText), kingText.slice(0, 80));

  const noHOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check("desktop no horizontal overflow", noHOverflow);
  await context.close();
}

// ---------- Mobile ----------
{
  const { context, page } = await newPage({ width: 390, height: 844 }, "mobile");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "p2-hero-mobile.png") });
  await runSearch(page);
  const cardCount = await page.locator("article").count();
  check("mobile search renders cards", cardCount > 0, `cards=${cardCount}`);
  await page.screenshot({ path: join(OUT, "p2-results-mobile.png") });
  const noHOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check("mobile no horizontal overflow", noHOverflow);
  await context.close();
}

await browser.close();

console.log(errors.length === 0 ? "console errors: none" : `console errors: ${errors.length}\n` + errors.join("\n"));
if (errors.length > 0) failures++;
console.log(failures === 0 ? "ALL REVIEW CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
