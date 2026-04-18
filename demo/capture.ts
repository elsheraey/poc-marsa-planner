/**
 * Playwright screenshot recorder for the Marsa demo video — walkthrough cut.
 *
 * Drives the live dev stack (backend :8000, frontend :5173) through the
 * full advisor journey — login, empty-clients, creating Omar as a new
 * client, filling goals, setting up three scenarios, running the sim,
 * and walking the report. One PNG per section; 17 sections.
 *
 * All screenshots are full-viewport 1920×1080 with no `clip` cropping —
 * Remotion draws any highlight overlays (rings, dim layers) in post so
 * the capture can stay image-native and doesn't blow up resolution when
 * a later pass wants to re-focus on a different card.
 *
 * Outputs (all gitignored): demo/assets/frame.<id>.png for each id.
 *
 * Run: `npm run capture` (wraps `tsx capture.ts`).
 *
 * Goal amounts intentionally diverge from the script's plain-English
 * recap — see docs/bugs/attainability-investigation.md. The backend's
 * sample-data calibration makes any goal under ~100M EGP trivially
 * attainable for Omar's inputs; the workaround here pushes the goals
 * into the engine's aspirational / out-of-reach bands so the video
 * reads honestly until the calibration bug is fixed.
 */
import { chromium, type Page, type Browser } from "playwright";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

// Section ids + captions come from the job spec. Kept local (vs imported
// from a shared manifest) so the capture can run standalone against the
// live stack and still know what to snap.
const SECTIONS = [
  { id: "01_login", caption: "Omar's advisor opens Marsa.", dur_ms: 3000 },
  { id: "02_signin", caption: "Signs in.", dur_ms: 2500 },
  { id: "03_clients_empty", caption: "No clients yet.", dur_ms: 2500 },
  { id: "04_new_client", caption: "Adds Omar as a new client.", dur_ms: 2500 },
  {
    id: "05_profile",
    caption:
      "Profile: 42, senior manager at a multinational, wife and two kids.",
    dur_ms: 5000,
  },
  { id: "06_proceed_goals", caption: "Proceeds to goals.", dur_ms: 2000 },
  {
    id: "07_goals",
    caption:
      "Five goals. Apartment. Three university options. Retirement.",
    dur_ms: 5500,
  },
  {
    id: "08_scenarios_setup",
    caption: "Three scenarios — one per university choice.",
    dur_ms: 5000,
  },
  {
    id: "09_scenario_picker",
    caption: "Each scenario picks a different university path.",
    dur_ms: 4000,
  },
  { id: "10_run_sim", caption: "Runs the simulation.", dur_ms: 2000 },
  { id: "11_report", caption: "The report.", dur_ms: 5000 },
  { id: "12_auc", caption: "Scenario 1 — AUC. Out of reach.", dur_ms: 4000 },
  {
    id: "13_guc",
    caption: "Scenario 2 — GUC. Still out of reach.",
    dur_ms: 4000,
  },
  {
    id: "14_cairo",
    caption: "Scenario 3 — Cairo University. Aspirational.",
    dur_ms: 4000,
  },
  {
    id: "15_inversion",
    caption: "Marsa's inversion suggests the advisor's next move.",
    dur_ms: 5000,
  },
  {
    id: "16_closing",
    caption: "Three choices. One honest conversation.",
    dur_ms: 4000,
  },
  { id: "17_tag", caption: "Marsa. Egyptian planning.", dur_ms: 3000 },
] as const;

const APP_URL = process.env.MARSA_APP_URL || "http://127.0.0.1:5173";
const ASSETS_DIR = resolve(__dirname, "assets");
const SRC_DIR = resolve(__dirname, "src");
const VIEWPORT = { width: 1920, height: 1080 } as const;

const STAMP = Date.now();
const DEMO_CLIENT = {
  fullName: "Omar Fahmy",
  email: `omar-${STAMP}@example.com`,
  birthdate: "01/06/1983", // → 42 on 2026-04-18
  phone: "+20 100 555 7788",
  employmentStatus: "employed",
  riskAppetite: "high",
} as const;

// Goal amounts are the Job-2 workaround for the attainability product
// bug documented in docs/bugs/attainability-investigation.md. When the
// backend is recalibrated, restore these to the original 5 / 8 / 3 /
// 0.5 / 30 M spec.
const GOALS: readonly {
  name: string;
  amount: number;
  year: number;
  inflationRate: number;
}[] = [
  { name: "Apartment — New Cairo", amount: 5_000_000, year: 2028, inflationRate: 0 },
  { name: "AUC — both kids", amount: 230_000_000, year: 2033, inflationRate: 0 },
  { name: "GUC / BUE — both kids", amount: 210_000_000, year: 2033, inflationRate: 0 },
  { name: "Cairo Uni — both kids", amount: 180_000_000, year: 2033, inflationRate: 0 },
  { name: "Retirement at 60", amount: 30_000_000, year: 2044, inflationRate: 0 },
];

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
 * Full-viewport still (1920×1080). No clipping — Remotion handles focus
 * via overlays in post.
 */
async function snap(page: Page, id: string): Promise<void> {
  const path = resolve(ASSETS_DIR, `frame.${id}.png`);
  // Let the layout settle — async data fetches (simulation result,
  // inversion suggestion, recharts animation) can paint 100–300 ms
  // after the DOM is "stable", and a screenshot taken earlier than
  // that catches a skeleton or a chart mid-animation.
  await pause(page, 500);
  await page.screenshot({
    path,
    fullPage: false,
    scale: "css",
    animations: "disabled",
  });
  console.log(`snap: ${id} → ${path}`);
}

async function registerAdvisor(page: Page): Promise<void> {
  const advisorEmail = `demo.advisor.${STAMP}@example.com`;
  await page.goto(`${APP_URL}/register`, { waitUntil: "networkidle" });
  await pause(page, 400);
  await page.fill("#reg-name", "Demo Advisor");
  await page.fill("#reg-email", advisorEmail);
  await page.fill("#reg-password", "Passw0rd!");
  await page.fill("#reg-confirm", "Passw0rd!");
  await pause(page, 200);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === "/clients", { timeout: 15000 });
  await pause(page, 600);
}

// --- Capture stages -----------------------------------------------------

async function capture01Login(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await pause(page, 800);
  await snap(page, "01_login");
}

async function capture02Signin(page: Page): Promise<void> {
  // Still on /login from section 01. Fill with the advisor creds the
  // script will sign in with — we use the demo advisor we're about to
  // register so the screenshot shows real data. Don't actually submit
  // (that would mutate state before the 02_signin frame is captured);
  // just fill and hover the submit button.
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await pause(page, 300);
  // Email + password inputs. Login.tsx uses id="login-email" / "login-password".
  try {
    await page.fill("#login-email", `demo.advisor.${STAMP}@example.com`);
    await page.fill("#login-password", "Passw0rd!");
  } catch {
    // Fall back to placeholder-based selection if ids change.
    const emailInput = page.locator('input[type="email"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    await emailInput.fill(`demo.advisor.${STAMP}@example.com`);
    await pwInput.fill("Passw0rd!");
  }
  await pause(page, 200);
  // Hover submit so the cursor sits near the Login button in the still.
  const submit = page.locator('button[type="submit"]').first();
  try {
    await submit.hover();
  } catch {
    /* non-fatal */
  }
  await pause(page, 300);
  await snap(page, "02_signin");
}

async function capture03ClientsEmpty(page: Page): Promise<void> {
  // Register the advisor (which auto-routes to /clients with 0 rows) so
  // the shot is the real empty state, not a reloaded cached list.
  await registerAdvisor(page);
  await pause(page, 400);
  await snap(page, "03_clients_empty");
}

async function capture04NewClient(page: Page): Promise<void> {
  // Land on the Profile step. Treat this shot as "Omar is being added"
  // — empty profile step with the cursor near the first input.
  await page.getByRole("button", { name: "Add New", exact: true }).click();
  await page.waitForURL("**/clients/new/profile", { timeout: 15000 });
  await pause(page, 600);
  try {
    const firstInput = page
      .locator("section")
      .first()
      .locator("input")
      .first();
    await firstInput.hover();
  } catch {
    /* non-fatal */
  }
  await snap(page, "04_new_client");
}

async function capture05Profile(page: Page): Promise<void> {
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
  await pause(page, 500);
  await snap(page, "05_profile");
}

async function capture06ProceedGoals(page: Page): Promise<void> {
  // Hover the Proceed button so the cursor is visible in the frame, then
  // click and wait for Goals to load, then snap the empty Goals step.
  const btn = page.getByRole("button", {
    name: "Proceed to Goals",
    exact: true,
  });
  try {
    await btn.hover();
  } catch {
    /* non-fatal */
  }
  await pause(page, 300);
  // Take the shot while the Profile is complete + Proceed hovered.
  await snap(page, "06_proceed_goals");
  await btn.click();
  await page.waitForURL("**/clients/new/goals", { timeout: 15000 });
  await pause(page, 600);
}

async function capture07Goals(page: Page): Promise<void> {
  // Seed starts with one empty row; add the remaining 4.
  for (let i = 1; i < GOALS.length; i += 1) {
    await page.locator("button.icon-btn-add[aria-label]").first().click();
    await pause(page, 80);
  }
  await pause(page, 300);
  const nameInputs = page.getByPlaceholder("Goal");
  const amountInputs = page.getByPlaceholder("Amount");
  const yearInputs = page.getByPlaceholder("Year");
  for (let i = 0; i < GOALS.length; i += 1) {
    await nameInputs.nth(i).fill(GOALS[i].name);
    await amountInputs.nth(i).fill(String(GOALS[i].amount));
    await yearInputs.nth(i).fill(String(GOALS[i].year));
  }
  await pause(page, 500);
  await snap(page, "07_goals");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL("**/clients/new/scenario", { timeout: 15000 });
  await pause(page, 600);
}

async function fillOneScenario(
  page: Page,
  index: number,
  spec: (typeof SCENARIOS)[number]
): Promise<void> {
  const card = page.locator("section.rounded-2xl").nth(index);
  await card.scrollIntoViewIfNeeded();
  await pause(page, 150);

  // Scenario name — first input inside the card.
  const nameInput = card.locator("input[placeholder]").first();
  await nameInput.fill(spec.name);
  await pause(page, 120);

  // Open the GoalPicker — button text exactly "Choose" (see
  // `wizard.scenario.card.selectGoals.choose` in i18n/en.ts).
  const pickerBtn = card
    .locator("button")
    .filter({ hasText: /^(Choose|Close)$/ });
  await pickerBtn.first().click();
  await pause(page, 300);

  // Tick each goal by row text.
  for (const name of spec.goalNames) {
    const row = card.locator("tr").filter({ hasText: name }).first();
    const cb = row.locator('input[type="checkbox"]');
    const isChecked = await cb.isChecked();
    if (!isChecked) await cb.click();
    await pause(page, 60);
  }
  await pause(page, 150);

  // Confirm — "Select" inside the picker.
  await card
    .getByRole("button", { name: "Select", exact: true })
    .first()
    .click();
  await pause(page, 250);

  // Investments: initial lump sum.
  const invHeader = card.locator('[data-testid="group-title-Investments"]');
  const invAdd = invHeader.locator("xpath=following-sibling::button[1]");
  await invAdd.click();
  await pause(page, 120);
  const invGroup = invHeader.locator("xpath=..").locator("xpath=..");
  const invInputs = invGroup.locator("input[type='number']");
  await invInputs.nth(0).fill(String(INITIAL_INVESTMENT));
  await invInputs.nth(1).fill(String(new Date().getFullYear()));
  await pause(page, 120);

  // Monthly Investments.
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

async function capture08and09Scenarios(page: Page): Promise<number> {
  // Add 2 more scenario cards so we end up with 3.
  for (let i = 1; i < SCENARIOS.length; i += 1) {
    await page
      .getByRole("button", { name: "Add New Scenario", exact: true })
      .click();
    await pause(page, 150);
  }

  // Fill scenarios 0 + 1 silently; we'll take the 09_scenario_picker
  // shot *while* scenario 2's picker is open so the video shows the
  // picker mid-flight on the Cairo-track card.
  let created = 0;
  for (let i = 0; i < SCENARIOS.length - 1; i += 1) {
    try {
      await fillOneScenario(page, i, SCENARIOS[i]);
      created += 1;
    } catch (err) {
      console.warn(
        `capture: scenario ${i} (${SCENARIOS[i].name}) failed — ${(err as Error).message.slice(0, 160)}`
      );
    }
  }

  // Snap 08_scenarios_setup — first two scenarios filled, third still
  // blank so the viewer sees "three cards, stacking".
  await page.evaluate(() =>
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  );
  await pause(page, 250);
  await snap(page, "08_scenarios_setup");

  // Scenario 2 (Cairo Uni track) — start filling but pause with the
  // picker OPEN so 09_scenario_picker captures checkboxes ticked.
  const lastIdx = SCENARIOS.length - 1;
  const lastSpec = SCENARIOS[lastIdx];
  try {
    const card = page.locator("section.rounded-2xl").nth(lastIdx);
    await card.scrollIntoViewIfNeeded();
    await pause(page, 150);
    const nameInput = card.locator("input[placeholder]").first();
    await nameInput.fill(lastSpec.name);
    await pause(page, 120);
    const pickerBtn = card
      .locator("button")
      .filter({ hasText: /^(Choose|Close)$/ });
    await pickerBtn.first().click();
    await pause(page, 400);
    for (const name of lastSpec.goalNames) {
      const row = card.locator("tr").filter({ hasText: name }).first();
      const cb = row.locator('input[type="checkbox"]');
      const isChecked = await cb.isChecked();
      if (!isChecked) await cb.click();
      await pause(page, 80);
    }
    await pause(page, 400);
    await snap(page, "09_scenario_picker");
    // Close the picker via "Select" so state commits, then finish the
    // rest of the scenario row (investments + monthly).
    await card
      .getByRole("button", { name: "Select", exact: true })
      .first()
      .click();
    await pause(page, 250);
    const invHeader = card.locator('[data-testid="group-title-Investments"]');
    const invAdd = invHeader.locator("xpath=following-sibling::button[1]");
    await invAdd.click();
    await pause(page, 120);
    const invGroup = invHeader.locator("xpath=..").locator("xpath=..");
    const invInputs = invGroup.locator("input[type='number']");
    await invInputs.nth(0).fill(String(INITIAL_INVESTMENT));
    await invInputs.nth(1).fill(String(new Date().getFullYear()));
    await pause(page, 120);
    const monHeader = card.locator(
      '[data-testid="group-title-Monthly Investments"]'
    );
    const monAdd = monHeader.locator("xpath=following-sibling::button[1]");
    await monAdd.click();
    await pause(page, 120);
    const monGroup = monHeader.locator("xpath=..").locator("xpath=..");
    const monInputs = monGroup.locator("input[type='number']");
    await monInputs.nth(0).fill(String(MONTHLY_INVESTMENT));
    await monInputs.nth(1).fill("0");
    await pause(page, 150);
    created += 1;
  } catch (err) {
    console.warn(
      `capture: scenario ${lastIdx} (${lastSpec.name}) failed — ${(err as Error).message.slice(0, 160)}`
    );
    // Best-effort fallback for 09_scenario_picker if we crashed before
    // the snap: capture whatever's on screen.
    try {
      await snap(page, "09_scenario_picker");
    } catch {
      /* already missing; main() will log it */
    }
  }
  return created;
}

async function capture10RunSim(page: Page): Promise<void> {
  // Shot right before clicking Run Simulation — scroll to bottom so the
  // CTA is visible in frame, then hover.
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as ScrollBehavior })
  );
  await pause(page, 300);
  const btn = page.getByRole("button", {
    name: "Run Simulation",
    exact: true,
  });
  try {
    await btn.hover();
  } catch {
    /* non-fatal */
  }
  await pause(page, 300);
  await snap(page, "10_run_sim");
  await Promise.all([
    page.waitForURL("**/clients/new/report", { timeout: 60000 }),
    btn.click(),
  ]);
}

async function captureReportShots(page: Page): Promise<string[]> {
  const degraded: string[] = [];
  await page
    .locator('[data-testid="moment-of-truth-headline"]')
    .waitFor({ timeout: 30000 });
  // Let recharts finish its entry animation and the inversion-suggestion
  // fetch resolve so the report is fully painted.
  await pause(page, 2500);

  // 11_report — top of the report, scrolled so the moment-of-truth
  // headline + first scenario card are in frame.
  await page.evaluate(() =>
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  );
  await pause(page, 400);
  await snap(page, "11_report");

  // 12/13/14 — highlight AUC / GUC / Cairo in turn. Clicking the card
  // promotes it to active, so the moment-of-truth headline + SE tail
  // update. The screenshot is FULL VIEWPORT — Remotion draws the ring
  // around the target card in post.
  const scenarioShots: { id: string; idx: number }[] = [
    { id: "12_auc", idx: 0 },
    { id: "13_guc", idx: 1 },
    { id: "14_cairo", idx: 2 },
  ];
  for (const shot of scenarioShots) {
    try {
      await page
        .locator(`[data-testid="scenario-card-${shot.idx}"]`)
        .click({ timeout: 4000 });
      await pause(page, 700);
    } catch {
      degraded.push(`${shot.id}: could not click card ${shot.idx}`);
    }
    // Keep viewport at top so all three cards remain visible in the
    // stack — the Remotion overlay needs consistent card coordinates
    // across 12/13/14.
    await page.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
    );
    await pause(page, 300);
    await snap(page, shot.id);
  }

  // 15_inversion — scroll to the inversion / moment-of-truth copy so
  // the "raise monthly / extend horizon" sentence is the subject.
  try {
    const headline = page.locator('[data-testid="moment-of-truth"]');
    await headline.scrollIntoViewIfNeeded();
    await pause(page, 200);
    await page.evaluate(() => window.scrollBy(0, -80));
    await pause(page, 300);
  } catch {
    degraded.push("15_inversion: scroll failed; using current viewport");
  }
  await snap(page, "15_inversion");

  // 16_closing — pull back to show all three scenario cards again in
  // one frame (overview).
  try {
    const list = page.locator('[data-testid="scenario-cards"]');
    await list.scrollIntoViewIfNeeded();
    await pause(page, 300);
    await page.evaluate(() => window.scrollBy(0, -40));
    await pause(page, 300);
  } catch {
    degraded.push("16_closing: scroll failed; using current viewport");
  }
  await snap(page, "16_closing");

  return degraded;
}

async function capture17Tag(browser: Browser): Promise<void> {
  // Separate context so the closing end card renders against a fresh
  // page. The Remotion composition also renders its own branded end
  // card over this frame, but we still capture a clean canvas here as
  // a safety fallback.
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const p = await ctx.newPage();
  // Brand-neutral page; the Remotion end card will overlay it entirely.
  await p.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await pause(p, 600);
  await snap(p, "17_tag");
  await ctx.close();
}

async function main() {
  mkdirSync(ASSETS_DIR, { recursive: true });
  mkdirSync(SRC_DIR, { recursive: true });
  // Clear stale PNGs.
  for (const name of readdirSync(ASSETS_DIR)) {
    if (
      name.toLowerCase().startsWith("frame.") &&
      name.toLowerCase().endsWith(".png")
    ) {
      rmSync(join(ASSETS_DIR, name));
    }
  }

  console.log(`capture: ${SECTIONS.length} sections → ${ASSETS_DIR}`);
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--font-render-hinting=none",
    ],
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
    if (msg.type() === "error") {
      console.log(`  !! console.error: ${msg.text().slice(0, 200)}`);
    }
  });

  const start = Date.now();
  const degraded: string[] = [];
  let scenarioCount = 0;
  try {
    await capture01Login(page);
    await capture02Signin(page);
    await capture03ClientsEmpty(page);
    await capture04NewClient(page);
    await capture05Profile(page);
    await capture06ProceedGoals(page);
    await capture07Goals(page);
    scenarioCount = await capture08and09Scenarios(page);

    // Read-back sanity check: the draftSlice scenarios should each have
    // the expected goalNames. Surface a degradation line if any scenario
    // came back with an empty selection (picker didn't save).
    try {
      const persisted = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const redux = (window as any).__MARSA_DEBUG_STORE__;
        if (!redux) return null;
        const state = redux.getState();
        return state?.draft?.scenarios?.map((s: { goalNames: string[] }) => s.goalNames) ?? null;
      });
      if (persisted) {
        for (let i = 0; i < SCENARIOS.length; i += 1) {
          const got = persisted[i] || [];
          const want = SCENARIOS[i].goalNames;
          const matches =
            got.length === want.length && want.every((n) => got.includes(n));
          if (!matches) {
            degraded.push(
              `picker: scenario ${i} (${SCENARIOS[i].name}) got goalNames=${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`
            );
          }
        }
      }
    } catch {
      /* debug store not exposed — non-fatal */
    }

    await capture10RunSim(page);
    const reportDegraded = await captureReportShots(page);
    degraded.push(...reportDegraded);
    await capture17Tag(browser);
  } catch (err) {
    console.error("capture: flow failed", err);
    degraded.push(`fatal: ${(err as Error).message.slice(0, 200)}`);
  }

  await page.close();
  await context.close();
  await browser.close();

  // Write a fresh manifest so Remotion can drive section timing from
  // the capture's source of truth. No audio this pass — manifest
  // carries captions + durations only.
  const manifestPath = resolve(SRC_DIR, "walkthrough.manifest.json");
  const totalMs = SECTIONS.reduce((s, sec) => s + sec.dur_ms, 0);
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        lang: "en",
        total_ms: totalMs,
        sections: SECTIONS.map((s) => ({
          id: s.id,
          caption: s.caption,
          duration_ms: s.dur_ms,
        })),
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    `capture: manifest → ${manifestPath} (${SECTIONS.length} sections, ${totalMs} ms)`
  );

  const took = ((Date.now() - start) / 1000).toFixed(1);
  const missing = SECTIONS.map((s) => s.id).filter(
    (id) => !readdirSync(ASSETS_DIR).includes(`frame.${id}.png`)
  );
  if (missing.length > 0) {
    degraded.push(`missing frames: ${missing.join(", ")}`);
  }
  console.log(
    `capture: done in ${took}s — ${scenarioCount}/${SCENARIOS.length} scenarios filled`
  );
  if (degraded.length > 0) {
    console.log("capture: degradations:");
    for (const d of degraded) console.log(`  - ${d}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
