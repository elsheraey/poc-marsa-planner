/**
 * Playwright walkthrough recorder for the Marsa demo video.
 *
 * Runs headful Chromium against the live dev stack (backend :8000,
 * frontend :5173), drives a register → wizard → simulate → report → AR
 * flow, and writes the WebM capture to `demo/assets/app-capture.webm`.
 *
 * Run:    npx tsx demo/capture.ts
 *         (or `npm run capture` from inside demo/)
 *
 * Everything is deliberately paced with waitForTimeout so the finished
 * video is readable at 1080p without needing to speed it up in
 * post-processing. Target raw capture length: ~60–75 seconds.
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, renameSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const APP_URL = process.env.MARSA_APP_URL || "http://127.0.0.1:5173";
const ASSETS_DIR = resolve(__dirname, "assets");
const OUTPUT_NAME = "app-capture.webm";

// Sara Mahmoud — the demo client. Name, email, birthdate are all
// synthetic; matches the script copy voiced by ElevenLabs.
const DEMO_CLIENT = {
  fullName: "Sara Mahmoud",
  email: "sara.mahmoud@example.com",
  birthdate: "01/06/1985",
  phone: "+20 100 123 4567",
  employmentStatus: "employed",
  riskAppetite: "high",
} as const;

async function pause(page: Page, ms: number, _reason: string) {
  // `_reason` is unused at runtime — it exists to document each pause at
  // the call site so a reviewer can read the pacing without chasing
  // numeric literals. Playwright's waitForTimeout is enough.
  await page.waitForTimeout(ms);
}

async function registerAdvisor(page: Page) {
  const stamp = Date.now();
  // `.local` is reserved per RFC 6761 and Pydantic's EmailStr (via
  // email-validator) rejects it. Use the RFC 2606 reserved `example.com`
  // so the register payload validates cleanly.
  const advisorEmail = `demo.advisor.${stamp}@example.com`;
  await page.goto(`${APP_URL}/register`, { waitUntil: "networkidle" });
  await pause(page, 1500, "register-idle");

  // Type field-by-field with a small delay so the capture looks natural at
  // normal playback speed — `fill` is instantaneous, `type` per-char is
  // jerky; a middle-ground is fill + small pause between fields.
  await page.fill("#reg-name", "Demo Advisor");
  await pause(page, 250, "name-typed");
  await page.fill("#reg-email", advisorEmail);
  await pause(page, 250, "email-typed");
  await page.fill("#reg-password", "Passw0rd!");
  await pause(page, 250, "pw-typed");
  await page.fill("#reg-confirm", "Passw0rd!");
  await pause(page, 1000, "register-form-filled");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === "/clients", { timeout: 15000 });
  await pause(page, 2500, "clients-empty");
}

async function fillProfile(page: Page) {
  // Reach the wizard profile step. Primary CTA on ClientsList is "Add New".
  await page.getByRole("button", { name: "Add New", exact: true }).click();
  await page.waitForURL("**/clients/new/profile", { timeout: 15000 });
  await pause(page, 2000, "profile-empty");

  // Fields live in a 2-column grid. The labels are translated but the
  // visible English copy is stable in the default locale (we register in
  // English). We target by order inside the first <section> so the
  // selectors are locale-agnostic.
  const p = DEMO_CLIENT;
  const section = page.locator("section").first();
  const inputs = section.locator("input");
  // Order matches ProfileStep.tsx: fullName, email, birthdate, phone.
  await inputs.nth(0).fill(p.fullName);
  await pause(page, 400, "name-typed");
  await inputs.nth(1).fill(p.email);
  await pause(page, 400, "email-typed");
  await inputs.nth(2).fill(p.birthdate);
  await pause(page, 400, "dob-typed");
  await inputs.nth(3).fill(p.phone);
  await pause(page, 400, "phone-typed");
  const selects = section.locator("select");
  await selects.nth(0).selectOption(p.employmentStatus);
  await pause(page, 400, "employment-selected");
  await selects.nth(1).selectOption(p.riskAppetite);
  await pause(page, 1600, "profile-filled");

  // Proceed to Goals — the primary CTA at the foot of the step.
  await page.getByRole("button", { name: "Proceed to Goals", exact: true }).click();
  await page.waitForURL("**/clients/new/goals", { timeout: 15000 });
}

async function fillGoals(page: Page) {
  await pause(page, 1500, "goals-empty");
  // `draftSlice.ts` seeds one empty goal row on init, so we don't need to
  // click the + button — just fill the seeded row directly.
  await page.getByPlaceholder("Goal").first().fill("House in New Cairo");
  await pause(page, 400, "goal-name-typed");
  await page.getByPlaceholder("Amount").first().fill("6000000");
  await pause(page, 400, "goal-amount-typed");
  await page.getByPlaceholder("Year").first().fill("2030");
  await pause(page, 400, "goal-year-typed");
  await page.getByPlaceholder("%").first().fill("10");
  await pause(page, 1600, "goal-filled");

  // Wizard goals step exposes "Save" as its primary CTA in the EN locale.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL("**/clients/new/scenario", { timeout: 15000 });
}

async function fillScenario(page: Page) {
  await pause(page, 800, "scenario-empty");

  // `draftSlice.ts` seeds one "Scenario 1" but with empty investments /
  // monthlyInvestments arrays — we *do* need to click + to add rows here.
  //
  // `group-title-Investments` is a sibling span to the add button inside
  // the Investments group, so we step up to the grouping <div> wrapping
  // the header + rows.
  const invHeader = page.locator('[data-testid="group-title-Investments"]');
  // The containing div is the direct parent of the [header, rows...] tree.
  // `.locator("xpath=..")` is the safest way to step up without assuming
  // class names.
  const invGroup = invHeader.locator("xpath=..").locator("xpath=..");
  await invGroup.locator("button.icon-btn-add").first().click();
  await pause(page, 600, "inv-row-added");
  const invInputs = invGroup.locator("input");
  await invInputs.nth(0).fill("500000");
  await pause(page, 400, "inv-amount-typed");
  await invInputs.nth(1).fill("2026");
  await pause(page, 800, "inv-filled");

  const monHeader = page.locator('[data-testid="group-title-Monthly Investments"]');
  const monGroup = monHeader.locator("xpath=..").locator("xpath=..");
  await monGroup.locator("button.icon-btn-add").first().click();
  await pause(page, 600, "mon-row-added");
  const monInputs = monGroup.locator("input");
  await monInputs.nth(0).fill("20000");
  await pause(page, 400, "mon-amount-typed");
  await monInputs.nth(1).fill("0");
  await pause(page, 1600, "scenario-filled");

  // Run Simulation — the primary CTA at the foot of the page.
  await Promise.all([
    page.waitForURL("**/clients/new/report", { timeout: 30000 }),
    page.getByRole("button", { name: "Run Simulation", exact: true }).click(),
  ]);
}

async function showReport(page: Page) {
  // Wait for the moment-of-truth headline to paint.
  await page.locator('[data-testid="moment-of-truth-headline"]').waitFor({ timeout: 15000 });
  await pause(page, 3500, "moment-of-truth-visible");

  // Scroll down to the chart so the recharts LineChart renders in frame.
  await page.mouse.wheel(0, 350);
  await pause(page, 2500, "chart-visible");

  // Scroll to the scenario cards — shows the attainability pill.
  await page.mouse.wheel(0, 350);
  await pause(page, 2500, "scenario-cards-visible");

  // Return to the top so the headline is in frame when we toggle locale.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(page, 2000, "scrolled-back-top");
}

async function toggleLocale(page: Page) {
  // The AppShell exposes the locale toggle with data-testid="locale-toggle".
  // Clicking it flips <html dir=...> and refetches the translation dict in
  // place — no navigation, no reload.
  await page.locator('[data-testid="locale-toggle"]').click();
  await pause(page, 4000, "arabic-report-visible");
  // Scroll once so the Arabic chart is also in frame.
  await page.mouse.wheel(0, 300);
  await pause(page, 3000, "arabic-chart-visible");
}

async function latestWebm(dir: string): Promise<string | null> {
  let newest: { path: string; mtime: number } | null = null;
  for (const name of readdirSync(dir)) {
    if (!name.toLowerCase().endsWith(".webm")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (!newest || st.mtimeMs > newest.mtime) newest = { path: full, mtime: st.mtimeMs };
  }
  return newest?.path ?? null;
}

async function main() {
  mkdirSync(ASSETS_DIR, { recursive: true });
  // Stale captures pollute the "latest webm" heuristic below — clear them up
  // front so the rename never targets the wrong file.
  for (const name of readdirSync(ASSETS_DIR)) {
    if (name.toLowerCase().endsWith(".webm")) rmSync(join(ASSETS_DIR, name));
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--font-render-hinting=none"],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: ASSETS_DIR, size: { width: 1920, height: 1080 } },
    deviceScaleFactor: 1,
    locale: "en-US",
  });
  const page = await context.newPage();

  // Surface backend responses so a silent 422 / 401 doesn't look like a
  // navigation timeout. Small log line per /api/* call.
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/api/")) {
      console.log(`  ← ${res.status()} ${u.replace(APP_URL, "")}`);
    }
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`  !! console.error: ${msg.text().slice(0, 200)}`);
  });

  const start = Date.now();
  try {
    await registerAdvisor(page);
    await fillProfile(page);
    await fillGoals(page);
    await fillScenario(page);
    await showReport(page);
    await toggleLocale(page);
  } catch (err) {
    console.error("capture: flow failed", err);
    // Fall through — we still want to close cleanly so any partial capture
    // is usable.
  }

  // Close in the right order so the WebM finalises before we rename.
  await page.close();
  await context.close();
  await browser.close();

  const latest = await latestWebm(ASSETS_DIR);
  if (!latest) {
    throw new Error("capture: no .webm produced in " + ASSETS_DIR);
  }
  const target = join(ASSETS_DIR, OUTPUT_NAME);
  if (latest !== target) renameSync(latest, target);

  const took = ((Date.now() - start) / 1000).toFixed(1);
  const sz = statSync(target).size;
  console.log(`capture: ok — ${target} (${(sz / 1024 / 1024).toFixed(1)} MB, ${took}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
