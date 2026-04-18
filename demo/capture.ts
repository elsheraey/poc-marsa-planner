/**
 * Playwright screenshot recorder for the Marsa demo video.
 *
 * Drives the live dev stack (backend :8000, frontend :5173) through the
 * multi-scenario Omar walkthrough and captures one still per voiceover
 * section. The section ids + count come from demo/tts.mjs's SECTIONS
 * export so the visuals are locked to the narration one-to-one.
 *
 * Outputs (all gitignored):
 *   demo/assets/frame.01_intro.png       — landing / login hero
 *   demo/assets/frame.02_goals.png       — Goals step, 5 rows filled
 *   demo/assets/frame.03_setup.png       — Scenario step, 3 scenario cards
 *   demo/assets/frame.04_auc.png         — Report, zoom on scenario-1 (AUC)
 *   demo/assets/frame.05_guc.png         — Report, zoom on scenario-2 (GUC)
 *   demo/assets/frame.06_cairo.png       — Report, zoom on scenario-3 (Cairo)
 *   demo/assets/frame.07_inversion.png   — Report, zoom on moment-of-truth
 *   demo/assets/frame.08_closing.png     — Report, pull-back on all cards
 *   demo/assets/frame.09_tag.png         — Brand end card (landing)
 *
 * Run:    npx tsx demo/capture.ts   (or `npm run capture`)
 *
 * Continuous video capture is deliberately NOT used here — the
 * previous pipeline's sync drift between free-flowing WebM and the
 * voiceover was the whole reason we moved to stills + Remotion motion.
 */
import { chromium, type Page, type Browser } from "playwright";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

// Section ids must match demo/tts.mjs's SECTIONS export. Kept as a
// local const rather than a cross-module ESM import so tsx doesn't
// have to resolve the .mjs at load time; the unit test would be adding
// a runtime check against the manifest but that's over-engineering for
// a 9-entry list that changes once a quarter. Single source of truth:
// if you add/rename sections in tts.mjs, update this list in the same
// commit — the render will otherwise silently drop screenshots.
const SECTION_IDS = [
  "01_intro",
  "02_goals",
  "03_setup",
  "04_auc",
  "05_guc",
  "06_cairo",
  "07_inversion",
  "08_closing",
  "09_tag",
] as const;

const APP_URL = process.env.MARSA_APP_URL || "http://127.0.0.1:5173";
const ASSETS_DIR = resolve(__dirname, "assets");
const VIEWPORT = { width: 1920, height: 1080 } as const;

// Sample profile data for the capture. Names, emails and dates are
// synthetic; the stamped email keeps each run idempotent against the
// backend's unique-email constraint.
const STAMP = Date.now();
const DEMO_CLIENT = {
  fullName: "Omar Fahmy",
  email: `omar-${STAMP}@example.com`,
  birthdate: "01/06/1983",
  phone: "+20 100 555 7788",
  employmentStatus: "employed",
  riskAppetite: "high",
} as const;

// Goals — mirror the voiceover ("apartment in New Cairo by 2028",
// "university for the kids 2033", "retirement at 60"). All five fit in
// one Goals step screen at 1920×1080.
const GOALS: readonly {
  name: string;
  amount: number;
  year: number;
  inflationRate: number;
}[] = [
  { name: "Apartment — New Cairo", amount: 5_000_000, year: 2028, inflationRate: 0 },
  { name: "AUC — both kids", amount: 8_000_000, year: 2033, inflationRate: 0 },
  { name: "GUC / BUE — both kids", amount: 3_000_000, year: 2033, inflationRate: 0 },
  { name: "Cairo Uni — both kids", amount: 500_000, year: 2033, inflationRate: 0 },
  { name: "Retirement at 60", amount: 30_000_000, year: 2044, inflationRate: 0 },
];

// Three scenarios — AUC-track, GUC-track, Cairo-track. Each picks a
// different university goal plus the apartment + retirement. Initial
// and monthly investments are identical so the only variable between
// scenarios is the university target amount.
const SCENARIOS: readonly {
  name: string;
  goalNames: string[];
}[] = [
  {
    name: "AUC track",
    goalNames: ["Apartment — New Cairo", "AUC — both kids", "Retirement at 60"],
  },
  {
    name: "GUC track",
    goalNames: ["Apartment — New Cairo", "GUC / BUE — both kids", "Retirement at 60"],
  },
  {
    name: "Cairo Uni track",
    goalNames: ["Apartment — New Cairo", "Cairo Uni — both kids", "Retirement at 60"],
  },
];
const INITIAL_INVESTMENT = 3_000_000;
const MONTHLY_INVESTMENT = 40_000;

async function pause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

/**
 * Full-viewport still (1920×1080) with optional clip region so the
 * Remotion composition can render the shot full-frame without CSS
 * transforms. Padding is added to the clip on all sides so the subject
 * is never against the screenshot edge.
 */
async function snap(
  page: Page,
  id: string,
  clip?: { x: number; y: number; width: number; height: number }
): Promise<void> {
  const path = resolve(ASSETS_DIR, `frame.${id}.png`);
  // Let the layout settle — async data fetches (simulation result,
  // inversion suggestion, recharts animation) can paint 100–300 ms
  // after the DOM is "stable", and a screenshot taken earlier than
  // that catches a skeleton or a chart mid-animation.
  await pause(page, 500);
  await page.screenshot({
    path,
    fullPage: false,
    clip,
    scale: "css",
    animations: "disabled",
  });
  const clipSuffix = clip ? ` (clip ${clip.width}×${clip.height})` : "";
  console.log(`snap: ${id} → ${path}${clipSuffix}`);
}

async function registerAdvisor(page: Page): Promise<void> {
  const advisorEmail = `demo.advisor.${STAMP}@example.com`;
  await page.goto(`${APP_URL}/register`, { waitUntil: "networkidle" });
  await pause(page, 600);
  await page.fill("#reg-name", "Demo Advisor");
  await page.fill("#reg-email", advisorEmail);
  await page.fill("#reg-password", "Passw0rd!");
  await page.fill("#reg-confirm", "Passw0rd!");
  await pause(page, 200);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === "/clients", { timeout: 15000 });
  await pause(page, 600);
}

async function capture01Landing(page: Page): Promise<void> {
  // Land on /login (not /register) — it's the cleaner hero shot for
  // the intro. Uses a separate navigation tab so we don't have to log
  // back out; the next steps run against a parallel authenticated tab.
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await pause(page, 800);
  await snap(page, "01_intro");
}

async function fillProfile(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Add New", exact: true }).click();
  await page.waitForURL("**/clients/new/profile", { timeout: 15000 });
  await pause(page, 600);

  const p = DEMO_CLIENT;
  const section = page.locator("section").first();
  const inputs = section.locator("input");
  await inputs.nth(0).fill(p.fullName);
  await inputs.nth(1).fill(p.email);
  await inputs.nth(2).fill(p.birthdate);
  await inputs.nth(3).fill(p.phone);
  const selects = section.locator("select");
  await selects.nth(0).selectOption(p.employmentStatus);
  await selects.nth(1).selectOption(p.riskAppetite);
  await pause(page, 400);

  await page.getByRole("button", { name: "Proceed to Goals", exact: true }).click();
  await page.waitForURL("**/clients/new/goals", { timeout: 15000 });
}

async function fillGoals(page: Page): Promise<void> {
  await pause(page, 500);
  // draftSlice seeds one empty goal row; we click + for the remaining
  // 4 so the Goals step ends up with exactly GOALS.length rows.
  for (let i = 1; i < GOALS.length; i += 1) {
    await page
      .locator("button.icon-btn-add[aria-label]")
      .first()
      .click();
    await pause(page, 80);
  }
  await pause(page, 300);

  // Fill each row. The grid order matches GoalsStep.tsx:
  //   [name, amount, year, payments, inflation, remove]
  const nameInputs = page.getByPlaceholder("Goal");
  const amountInputs = page.getByPlaceholder("Amount");
  const yearInputs = page.getByPlaceholder("Year");
  for (let i = 0; i < GOALS.length; i += 1) {
    await nameInputs.nth(i).fill(GOALS[i].name);
    await amountInputs.nth(i).fill(String(GOALS[i].amount));
    await yearInputs.nth(i).fill(String(GOALS[i].year));
  }
  await pause(page, 400);
  await snap(page, "02_goals");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL("**/clients/new/scenario", { timeout: 15000 });
}

async function fillOneScenario(
  page: Page,
  index: number,
  spec: (typeof SCENARIOS)[number]
): Promise<void> {
  // Scroll the target card into view so the picker + investment fields
  // are visible; makes debugging in headful mode easier.
  const card = page.locator("section.rounded-2xl").nth(index);
  await card.scrollIntoViewIfNeeded();

  // Name input — first input inside the card.
  const nameInput = card.locator('input[placeholder]').first();
  await nameInput.fill(spec.name);
  await pause(page, 120);

  // Open the GoalPicker, tick the goals we want, confirm. The picker
  // toggle button reads "Choose" (EN) / "اختر" (AR) per
  // `wizard.scenario.card.selectGoals.choose` — it sits right after
  // the "Select goals for this scenario" label inside the scenario
  // card. We click the first matching button within THIS card's
  // DOM subtree so the click doesn't leak to a sibling scenario.
  const pickerBtn = card
    .locator("button")
    .filter({ hasText: /^(Choose|Close)$/ });
  await pickerBtn.first().click();
  await pause(page, 200);

  // Each goal row in the picker has a checkbox. Match by the visible
  // goal name in the row; the picker renders them in declaration order.
  for (const name of spec.goalNames) {
    const row = card.locator("tr").filter({ hasText: name }).first();
    const cb = row.locator('input[type="checkbox"]');
    const isChecked = await cb.isChecked();
    if (!isChecked) await cb.click();
  }
  await pause(page, 150);
  // "Select" / confirm button inside the picker.
  await card.getByRole("button", { name: "Select", exact: true }).first().click();
  await pause(page, 200);

  // Investments — click + inside the Investments group, then fill
  // amount/year on the row that appears.
  const invHeader = card.locator('[data-testid="group-title-Investments"]');
  const invAdd = invHeader.locator("xpath=following-sibling::button[1]");
  await invAdd.click();
  await pause(page, 120);
  // First investment row lives inside the same group wrapper. Target
  // the first two number inputs after the Investments header.
  const invGroup = invHeader.locator("xpath=..").locator("xpath=..");
  const invInputs = invGroup.locator("input[type='number']");
  await invInputs.nth(0).fill(String(INITIAL_INVESTMENT));
  await invInputs.nth(1).fill(String(new Date().getFullYear()));
  await pause(page, 120);

  // Monthly Investments — same pattern.
  const monHeader = card.locator('[data-testid="group-title-Monthly Investments"]');
  const monAdd = monHeader.locator("xpath=following-sibling::button[1]");
  await monAdd.click();
  await pause(page, 120);
  const monGroup = monHeader.locator("xpath=..").locator("xpath=..");
  const monInputs = monGroup.locator("input[type='number']");
  await monInputs.nth(0).fill(String(MONTHLY_INVESTMENT));
  await monInputs.nth(1).fill("0");
  await pause(page, 150);
}

async function fillScenarios(page: Page): Promise<number> {
  await pause(page, 400);
  // Add 2 more scenario cards so we end up with 3 (draftSlice seeds 1).
  for (let i = 1; i < SCENARIOS.length; i += 1) {
    await page.getByRole("button", { name: "Add New Scenario", exact: true }).click();
    await pause(page, 120);
  }

  let created = 0;
  for (let i = 0; i < SCENARIOS.length; i += 1) {
    try {
      await fillOneScenario(page, i, SCENARIOS[i]);
      created += 1;
    } catch (err) {
      console.warn(
        `capture: scenario ${i} (${SCENARIOS[i].name}) failed — ${(err as Error).message.slice(0, 160)}`
      );
      // Continue so we still produce a usable walkthrough with whatever
      // scenarios DID fill. The report step handles 1–4 scenarios.
    }
  }
  await pause(page, 400);
  // Scroll to top so the 03_setup shot shows all three scenario cards
  // starting from the first header.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  await pause(page, 250);
  await snap(page, "03_setup");

  // Kick the simulation. Even if some scenarios failed to create, we
  // run whatever landed.
  await Promise.all([
    page.waitForURL("**/clients/new/report", { timeout: 60000 }),
    page.getByRole("button", { name: "Run Simulation", exact: true }).click(),
  ]);
  return created;
}

async function scenarioClip(
  page: Page,
  index: number
): Promise<{ x: number; y: number; width: number; height: number } | undefined> {
  // The scenario cards on the report are rendered as <button
  // data-testid="scenario-card-N">. Clip to the full viewport width and
  // extend vertically to cover both the moment-of-truth headline above
  // and the card itself — this way the shot reads "here's what the
  // voiceover is pointing at" rather than a context-free bar chart.
  const card = page.locator(`[data-testid="scenario-card-${index}"]`);
  try {
    await card.waitFor({ timeout: 5000 });
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -180));
    await new Promise((r) => setTimeout(r, 250));
    const box = await card.boundingBox();
    if (!box) return undefined;
    const pad = 24;
    const topY = Math.max(0, Math.round(box.y - pad - 220)); // include moment-of-truth above
    const bottomY = Math.min(VIEWPORT.height, Math.round(box.y + box.height + pad + 40));
    return {
      x: 0,
      y: topY,
      width: VIEWPORT.width,
      height: Math.max(200, bottomY - topY),
    };
  } catch {
    return undefined;
  }
}

async function captureReport(page: Page, scenarioCount: number): Promise<string[]> {
  // Wait for the moment-of-truth headline — primary signal that the
  // simulation finished and the report is painted.
  await page
    .locator('[data-testid="moment-of-truth-headline"]')
    .waitFor({ timeout: 30000 });
  // Give recharts a beat to finish its entry animation and the
  // inversion-suggestion fetch time to resolve.
  await pause(page, 2000);

  const degraded: string[] = [];
  const scenarioSections = ["04_auc", "05_guc", "06_cairo"] as const;

  // Per-scenario zoom shots (04/05/06) — click the card first so the
  // moment-of-truth headline + suggestions update to that scenario,
  // then clip to the active card's bounding box.
  for (let i = 0; i < scenarioSections.length; i += 1) {
    const id = scenarioSections[i];
    if (i >= scenarioCount) {
      degraded.push(`${id}: only ${scenarioCount} scenario(s) created; full-viewport fallback`);
      await snap(page, id);
      continue;
    }
    try {
      await page.locator(`[data-testid="scenario-card-${i}"]`).click({ timeout: 4000 });
      await pause(page, 700); // let headline + chart re-render
    } catch {
      degraded.push(`${id}: could not click scenario card; used previous active`);
    }
    const clip = await scenarioClip(page, i);
    if (!clip) degraded.push(`${id}: scenarioClip returned undefined; full-viewport fallback`);
    await snap(page, id, clip);
  }

  // 07_inversion — zoom on the moment-of-truth card so the inversion
  // sentence is the subject. The "Attainable" branch renders a short
  // headline without the "Raise monthly to …" suggestion; the shortfall
  // branch renders the suggestion inline. Either way we clip generously
  // (card + scenario-cards section below it) so the shot reads as
  // "the honesty moment" rather than a 2-inch sliver.
  try {
    const headlineEl = page.locator('[data-testid="moment-of-truth"]');
    await headlineEl.waitFor({ timeout: 5000 });
    await headlineEl.scrollIntoViewIfNeeded();
    await pause(page, 300);
    // Scroll a touch further up so there is room above the card. The
    // moment-of-truth card is typically the first thing below the
    // wizard tabs — a 120 px scroll pulls the header out of frame and
    // leaves the card + a thin strip of canvas above it.
    await page.evaluate(() => window.scrollBy(0, -80));
    await pause(page, 200);
    const box = await headlineEl.boundingBox();
    if (box) {
      // Widen the clip to the full viewport horizontally and extend it
      // down to cover the first scenario card so the shot implicates
      // both the headline and the bar the voiceover is pointing at.
      const pad = 32;
      const height = Math.min(
        VIEWPORT.height - Math.max(0, Math.round(box.y - pad)),
        Math.round(box.height + pad * 2 + 320)
      );
      await snap(page, "07_inversion", {
        x: 0,
        y: Math.max(0, Math.round(box.y - pad)),
        width: VIEWPORT.width,
        height,
      });
    } else {
      degraded.push("07_inversion: boundingBox null; full-viewport fallback");
      await snap(page, "07_inversion");
    }
  } catch (err) {
    degraded.push(
      `07_inversion: ${(err as Error).message.slice(0, 100)}; full-viewport fallback`
    );
    await snap(page, "07_inversion");
  }

  // 08_closing — pull back to a full-viewport shot of the scenario
  // cards section so all three cards are in frame simultaneously.
  try {
    const list = page.locator('[data-testid="scenario-cards"]');
    await list.scrollIntoViewIfNeeded();
    await pause(page, 400);
  } catch {
    // non-fatal — just shoot the current viewport
  }
  await snap(page, "08_closing");

  return degraded;
}

async function capture09Tag(browser: Browser): Promise<void> {
  // Separate context so the closing brand shot is a fresh /login page
  // (clean canvas) rather than the report page we ended on.
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const p = await ctx.newPage();
  await p.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await pause(p, 600);
  await snap(p, "09_tag");
  await ctx.close();
}

async function main() {
  mkdirSync(ASSETS_DIR, { recursive: true });
  // Clear any stale PNGs so we never mix an old capture with a new one.
  for (const name of readdirSync(ASSETS_DIR)) {
    if (name.toLowerCase().startsWith("frame.") && name.toLowerCase().endsWith(".png")) {
      rmSync(join(ASSETS_DIR, name));
    }
  }

  console.log(`capture: ${SECTION_IDS.length} sections → ${ASSETS_DIR}`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--font-render-hinting=none"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: "en-US",
  });
  const page = await context.newPage();

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
  const degraded: string[] = [];
  let scenarioCount = 0;
  try {
    await capture01Landing(page);
    await registerAdvisor(page);
    await fillProfile(page);
    await fillGoals(page);
    scenarioCount = await fillScenarios(page);
    const reportDegraded = await captureReport(page, scenarioCount);
    degraded.push(...reportDegraded);
    await capture09Tag(browser);
  } catch (err) {
    console.error("capture: flow failed", err);
    degraded.push(`fatal: ${(err as Error).message.slice(0, 200)}`);
  }

  await page.close();
  await context.close();
  await browser.close();

  const took = ((Date.now() - start) / 1000).toFixed(1);
  const missing = SECTION_IDS.filter(
    (id) => !readdirSync(ASSETS_DIR).includes(`frame.${id}.png`)
  );
  if (missing.length > 0) {
    degraded.push(`missing frames: ${missing.join(", ")}`);
  }
  console.log(`capture: done in ${took}s — ${scenarioCount}/${SCENARIOS.length} scenarios`);
  if (degraded.length > 0) {
    console.log("capture: degradations:");
    for (const d of degraded) console.log(`  - ${d}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
