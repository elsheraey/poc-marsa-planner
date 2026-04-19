/**
 * Playwright screenshot recorder for the Marsa demo video — walkthrough cut.
 *
 * Drives the live dev stack (backend :8000, frontend :5173) through the
 * full advisor journey — login, empty-clients, creating Omar as a new
 * client, filling goals, setting up three scenarios, running the sim,
 * and walking the report. One PNG per narrated section; 9 sections.
 *
 * The script → capture → compose chain's single source of truth is
 * `demo/src/sections.mjs`, which exports a SECTIONS array. This file
 * imports that array and snaps one PNG per `s.id`, so the caption the
 * Remotion composition paints on top of each frame is literally the
 * same string the voiceover synthesiser will speak (when audio is
 * re-enabled). Screenshots: full-viewport 1920×1080 with no `clip` —
 * Remotion draws any highlight overlays (rings, dim layers) in post.
 *
 * Outputs (all gitignored): demo/assets/frame.<id>.png for each id,
 * and demo/src/walkthrough.manifest.json (the timing manifest the
 * Remotion composition reads for section durations).
 *
 * Run: `npm run capture` (wraps `tsx capture.ts`).
 *
 * Goal amounts match the script's plain-English recap. Each goal
 * carries a 16%/yr inflationRate so the frontend inflates today's EGP
 * figure to the goal year before hitting the backend — backend's
 * goal_target_amount semantic is nominal-at-terminal-year.
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
// @ts-expect-error — .mjs ESM with no .d.ts; field shape is trivial.
import { SECTIONS as SHARED_SECTIONS, defaultDurationMs } from "./src/sections.mjs";

// ---------------------------------------------------------------------
// Section-keyed capture plan.
//
// The narrated sections (SHARED_SECTIONS) are the caption + voiceover
// source of truth. Each one gets ONE screenshot named frame.<id>.png.
// Section 09_tag is a pure Remotion end card (black bg + wordmark) —
// we don't snap the frontend for it; tag_frame_needed = false.
// ---------------------------------------------------------------------
type NarratedSection = { id: string; text: string };
const NARRATED: readonly NarratedSection[] = SHARED_SECTIONS as NarratedSection[];

// Map each narrated-section id → which advisor-journey stage produces
// that shot. The capture driver walks the wizard linearly; when it
// reaches a stage that matches a section id, it takes the snap. The
// 09_tag section is fully rendered in Remotion and doesn't need a PNG.
//
// 01_intro is special — the section still exists as one narrated beat
// (Omar's biography), but its background is rendered in Remotion as a
// 3-image crossfade (login → signing in → inputting client data) so
// the visuals progress alongside the narration. The three shots live
// at frame.01_intro_a.png / _b.png / _c.png and are captured out-of-band
// inside capture01Intro + walkToGoalsStep; the base "01_intro" id is
// therefore marked false here so the missing-frames sanity check at
// the end of main() doesn't look for a single frame.01_intro.png.
const FRAME_NEEDED: Record<string, boolean> = {
  "01_intro": false,
  "01_intro_a": true,
  "01_intro_b": true,
  "01_intro_c": true,
  "02_goals": true,
  "03_setup": true,
  "04_scenario1": true,
  "05_scenario2": true,
  "06_scenario3": true,
  "07_inversion": true,
  "08_closing": true,
  "09_tag": false,
};

const APP_URL = process.env.MARSA_APP_URL || "http://127.0.0.1:5173";
const ASSETS_DIR = resolve(__dirname, "assets");
const SRC_DIR = resolve(__dirname, "src");
const VIEWPORT = { width: 1920, height: 1080 } as const;

const STAMP = Date.now();
const DEMO_CLIENT = {
  fullName: "Omar Fahmy",
  email: `omar-${STAMP}@example.com`,
  birthdate: "01/06/1983", // → 42 on 2026-04-19
  phone: "+20 100 555 7788",
  employmentStatus: "employed",
  riskAppetite: "moderate",
} as const;

// Seven goals. The three retirement variants are the meaningful lever
// across scenarios — each scenario picks one plus one of three
// university options. Amounts are in 2026 EGP; 16%/yr inflation matches
// the backend's median implied CPI 2026-2047.
//
// Retirement targets sized so the three scenarios span the verdict
// spectrum (out_of_reach → aspirational → attainable) at Omar's plan:
// 3M initial + 40k/mo. Targets may be re-tuned post-first-render if
// the engine lands different verdicts — see README step 5.
const GOALS: readonly {
  name: string;
  amount: number;
  year: number;
  inflationRate: number;
}[] = [
  { name: "New Cairo apartment", amount: 5_000_000, year: 2028, inflationRate: 0.16 },
  { name: "AUC tuition", amount: 8_000_000, year: 2033, inflationRate: 0.16 },
  { name: "GUC or BUE tuition", amount: 3_000_000, year: 2033, inflationRate: 0.16 },
  { name: "Cairo University tuition", amount: 500_000, year: 2033, inflationRate: 0.16 },
  { name: "Retire Comfortable (60)", amount: 55_000_000, year: 2044, inflationRate: 0.16 },
  { name: "Retire Standard (60)", amount: 33_000_000, year: 2044, inflationRate: 0.16 },
  { name: "Retire Modest (63)", amount: 15_000_000, year: 2047, inflationRate: 0.16 },
];

// Three life-path scenarios — differ on BOTH university choice and
// retirement target. That's the point: Marsa's scenario comparison
// earns its keep by letting the advisor contrast total plan ambition,
// not just tuition line items.
const SCENARIOS: readonly {
  name: string;
  snapId: string; // which narrated-section frame this scenario produces
  goalNames: string[];
}[] = [
  {
    name: "Everything I Want",
    snapId: "04_scenario1",
    goalNames: [
      "New Cairo apartment",
      "AUC tuition",
      "Retire Comfortable (60)",
    ],
  },
  {
    name: "Middle Path",
    snapId: "05_scenario2",
    goalNames: [
      "New Cairo apartment",
      "GUC or BUE tuition",
      "Retire Standard (60)",
    ],
  },
  {
    name: "Pragmatic",
    snapId: "06_scenario3",
    goalNames: [
      "New Cairo apartment",
      "Cairo University tuition",
      "Retire Modest (63)",
    ],
  },
];
const INITIAL_INVESTMENT = 3_000_000;
const MONTHLY_INVESTMENT = 40_000;

async function pause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

/**
 * Full-viewport still (1920×1080) by default. No clipping — Remotion
 * handles focus via overlays in post.
 *
 * When `fullPage` is true we capture the entire scrollable document
 * instead (a tall 1920×N image). This is used for 01_intro_c so the
 * Remotion composition can animate a scroll-pan over the Profile step,
 * following the advisor's actual scroll from the six required fields at
 * the top down to the Advanced-profile dossier below.
 */
async function snap(
  page: Page,
  id: string,
  opts: { fullPage?: boolean } = {}
): Promise<void> {
  if (FRAME_NEEDED[id] === false) {
    console.log(`snap: ${id} → skipped (rendered by Remotion)`);
    return;
  }
  const path = resolve(ASSETS_DIR, `frame.${id}.png`);
  // Let the layout settle — async data fetches (simulation result,
  // inversion suggestion, recharts animation) can paint 100–300 ms
  // after the DOM is "stable", and a screenshot taken earlier than
  // that catches a skeleton or a chart mid-animation.
  await pause(page, 500);
  await page.screenshot({
    path,
    fullPage: opts.fullPage === true,
    scale: "css",
    animations: "disabled",
  });
  console.log(
    `snap: ${id} → ${path}${opts.fullPage ? " (fullPage)" : ""}`
  );
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

/**
 * 01_intro — three intro frames covering the advisor opening the app
 * and starting to enter a client. The narration ("Omar is 42…") runs
 * ~15.5s, so we crossfade between three visual moments behind the
 * same caption:
 *   _a: login page, empty form
 *   _b: login page with email + password filled (pre-submit "signing
 *       in" beat — we don't actually authenticate through /login in
 *       this driver because the real flow uses /register, but the
 *       filled-form state is the visual we want for ~3s of narration)
 *   _c: captured later inside walkToGoalsStep once the profile step
 *       has Omar's name / email / birthdate typed in.
 */
/**
 * 00_brand — the Landing page, pre-login. This is the "what is this
 * product?" establishing shot that runs over Brian's "Marsa is
 * financial planning software for wealth advisors. Here's one session
 * in full." line before the Omar narrative begins.
 */
async function capture00Brand(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/`, { waitUntil: "networkidle" });
  await pause(page, 800);
  await snap(page, "00_brand");
}

async function capture01Intro(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await pause(page, 800);
  // _a: empty login form. Focus the email field so there's a blinking
  // caret in-frame (sells "advisor just landed here").
  try {
    await page.locator("#login-email").focus();
  } catch {
    /* focus is cosmetic — don't fail the run if the selector changes */
  }
  await pause(page, 200);
  await snap(page, "01_intro_a");

  // _b: login filled, pre-submit. Fill the two fields, then move focus
  // to the submit button so the primary CTA is visually pressed-into.
  try {
    await page.locator("#login-email").fill(DEMO_CLIENT.email);
    await page.locator("#login-password").fill("Passw0rd!");
    await pause(page, 250);
    await page.locator('button[type="submit"]').first().focus();
  } catch (err) {
    console.warn(
      `capture: 01_intro_b fill failed — ${(err as Error).message.slice(0, 140)}`
    );
  }
  await pause(page, 250);
  await snap(page, "01_intro_b");
}

/**
 * Walk the advisor-setup wizard through to the Goals step. No snaps
 * along the way — the narration jumps straight from "Omar is 42…"
 * (intro) to "Three goals…" (02_goals), so the intermediate UI
 * (register, Add New, profile form, proceed-to-goals) is driven
 * silently.
 */
async function walkToGoalsStep(page: Page): Promise<void> {
  await registerAdvisor(page);
  await pause(page, 400);

  // Add New client → profile step.
  await page.getByRole("button", { name: "Add New", exact: true }).click();
  await page.waitForURL("**/clients/new/profile", { timeout: 15000 });
  await pause(page, 600);

  // Fill profile. All 6 required fields go in BEFORE we snap 01_intro_c
  // so the intro crossfade's final beat shows a fully-completed dossier
  // — the advisor has finished setting Omar up, not caught mid-typing.
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
  await pause(page, 200);

  // Open the "Advanced profile" disclosure and fill the fields that
  // reinforce the narration ("~155,000 pounds come in each month"):
  // employment income, monthly expenses, one dependent, one income
  // source. Matches the AdvancedDossier DOM in ProfileStep.tsx: two
  // trailing number inputs (employmentIncome, monthlyExpenses), plus
  // add-buttons for dependents (aria-label on the icon-btn-add) and
  // income sources. Assets / debts are intentionally skipped — not in
  // the narration and would clutter the shot.
  const dossierOpenedAt = Date.now();
  try {
    const dossier = page.locator("section").nth(1);
    const summary = dossier.locator("summary").first();
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    await pause(page, 300);

    // Dependent — one row: Ali Omar / son / 01/09/2019.
    // (In Arab naming, a son's middle name is the father's FIRST name.)
    try {
      const depAdd = dossier.getByRole("button", {
        name: /dependents/i,
        exact: false,
      });
      await depAdd.first().click();
      await pause(page, 200);
      // After click, the dependents block renders a row with three
      // inputs (name, relation <select>, birthdate) and a remove btn.
      // Scope to the block by filtering for the just-created row's
      // inputs. The dependents block is the only one using a grid
      // template with 1fr_1fr_1fr_auto immediately under its header.
      const depRows = dossier
        .locator("div.grid.grid-cols-\\[1fr_1fr_1fr_auto\\]")
        .filter({ has: page.locator("select") });
      const depRow = depRows.first();
      const depInputs = depRow.locator("input");
      const depSelects = depRow.locator("select");
      await depInputs.nth(0).fill("Ali Omar");
      await depSelects.nth(0).selectOption("son");
      await depInputs.nth(1).fill("01/09/2019");
      await pause(page, 150);
    } catch (err) {
      console.warn(
        `capture: dependent fill skipped — ${(err as Error).message.slice(0, 140)}`
      );
    }

    // Income source — fill the default row the slice seeds with
    // (draftSlice initial state includes one empty incomeSources row).
    // No Add click — that would leave an extra blank row beneath the
    // populated one and dilute the "completed dossier" read.
    try {
      // The income-sources row has three inputs (source text + two
      // number fields) and no <select>; disambiguate from dependents
      // that way.
      const incRows = dossier
        .locator("div.grid.grid-cols-\\[1fr_1fr_1fr_auto\\]")
        .filter({ hasNot: page.locator("select") });
      const incRow = incRows.first();
      const incInputs = incRow.locator("input");
      await incInputs.nth(0).fill("Salary");
      await incInputs.nth(1).fill("155000");
      await incInputs.nth(2).fill("0");
      await pause(page, 150);
    } catch (err) {
      console.warn(
        `capture: income fill skipped — ${(err as Error).message.slice(0, 140)}`
      );
    }

    // Employment income + monthly expenses — the final two number
    // inputs inside the AdvancedDossier block. They're the last pair
    // rendered by the component, so locating the last two
    // `input[type="number"]` under the dossier section is robust
    // against the repeater rows above.
    try {
      const numberInputs = dossier.locator('input[type="number"]');
      const n = await numberInputs.count();
      if (n >= 2) {
        await numberInputs.nth(n - 2).fill("155000"); // employmentIncome
        await numberInputs.nth(n - 1).fill("95000"); // monthlyExpenses
        await pause(page, 150);
      } else {
        console.warn(
          `capture: employment income / expenses skipped — expected ≥2 number inputs, got ${n}`
        );
      }
    } catch (err) {
      console.warn(
        `capture: employment income / expenses failed — ${(err as Error).message.slice(0, 140)}`
      );
    }

    // Scroll back to the top of the page so the full-page screenshot
    // below begins its natural document flow at the six required
    // fields (the visual anchor of the pan's first frame). The
    // advanced-dossier disclosure stays open — Playwright's
    // fullPage: true captures the entire expanded document regardless
    // of the current scroll position.
    try {
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
      );
      await pause(page, 300);
    } catch {
      /* framing is cosmetic — don't fail the run */
    }
  } catch (err) {
    console.warn(
      `capture: advanced-profile disclosure skipped after ${Date.now() - dossierOpenedAt}ms — ${(err as Error).message.slice(0, 140)}`
    );
  }

  // Snap 01_intro_c — FULL PAGE. The Remotion composition reads this
  // as a tall 1920×N image and animates a linear Y-offset across the
  // section's shot-C slice so the viewer follows the advisor's scroll
  // from the six required fields at the top down to the Advanced
  // profile dossier below. Dimensions are logged so the `render`
  // report can confirm ≥ 2000 px (otherwise the pan has nothing to
  // pan through and Marsa.tsx falls back to a static top-aligned
  // render).
  await pause(page, 400);
  await snap(page, "01_intro_c", { fullPage: true });

  // Close the disclosure again so the Proceed button stays visible
  // without scrolling, and scroll back to top for the CTA click.
  await page.evaluate(() =>
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  );
  await pause(page, 200);

  // Proceed to Goals.
  await page
    .getByRole("button", { name: "Proceed to Goals", exact: true })
    .click();
  await page.waitForURL("**/clients/new/goals", { timeout: 15000 });
  await pause(page, 600);
}

/** 02_goals — all 7 goals visible on the Goals step. */
async function capture02Goals(page: Page): Promise<void> {
  // Seed starts with one empty row; add the remaining 6.
  for (let i = 1; i < GOALS.length; i += 1) {
    await page.locator("button.icon-btn-add[aria-label]").first().click();
    await pause(page, 80);
  }
  await pause(page, 300);
  const nameInputs = page.getByPlaceholder("Goal");
  const amountInputs = page.getByPlaceholder("Amount");
  const yearInputs = page.getByPlaceholder("Year");
  // The inflation field uses placeholder "%" which is also used by other
  // percentage inputs elsewhere in the wizard; inside the Goals step it
  // maps 1:1 with the goal rows because the row layout is the only place
  // on this page that renders the per-goal inflation column.
  const inflationInputs = page.getByPlaceholder("%");
  for (let i = 0; i < GOALS.length; i += 1) {
    await nameInputs.nth(i).fill(GOALS[i].name);
    await amountInputs.nth(i).fill(String(GOALS[i].amount));
    await yearInputs.nth(i).fill(String(GOALS[i].year));
    // Store as percent ("16") — toDecimalRate on the frontend divides
    // by 100 when abs > 1, so 16 becomes 0.16 on the wire.
    await inflationInputs
      .nth(i)
      .fill(String(Math.round(GOALS[i].inflationRate * 100)));
  }
  await pause(page, 500);
  // Scroll so the first row is visible and ideally all 7 are in frame
  // (list is scrollable; 7 rows at ~90px each ≈ 630px + header fits in
  // the 1080 viewport).
  await page.evaluate(() =>
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  );
  await pause(page, 300);
  await snap(page, "02_goals");
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

  // Open the GoalPicker — button text exactly "Choose".
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
}

/** 03_setup — Scenario step with all 3 scenario cards configured. */
async function capture03ScenarioSetup(page: Page): Promise<number> {
  // Add 2 more scenario cards so we have 3.
  for (let i = 1; i < SCENARIOS.length; i += 1) {
    await page
      .getByRole("button", { name: "Add New Scenario", exact: true })
      .click();
    await pause(page, 150);
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
    }
  }

  // Scroll back to the top so all 3 scenario cards are in frame as a
  // stack — the 03_setup shot needs to show three named cards with
  // their lifestyle labels.
  await page.evaluate(() =>
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  );
  await pause(page, 300);
  await snap(page, "03_setup");
  return created;
}

async function captureReportShots(page: Page): Promise<string[]> {
  const degraded: string[] = [];
  await page
    .locator('[data-testid="moment-of-truth-headline"]')
    .waitFor({ timeout: 30000 });
  // Let recharts finish its entry animation and the inversion-suggestion
  // fetch resolve so the report is fully painted.
  await pause(page, 2500);

  // 04/05/06 — highlight each scenario in turn. Clicking the card
  // promotes it to active, so the moment-of-truth headline + SE tail
  // update. The screenshot is FULL VIEWPORT — Remotion draws the ring
  // around the target card in post.
  const scenarioShots: { id: string; idx: number }[] = [
    { id: "04_scenario1", idx: 0 },
    { id: "05_scenario2", idx: 1 },
    { id: "06_scenario3", idx: 2 },
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
    // across 04/05/06.
    await page.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
    );
    await pause(page, 300);
    await snap(page, shot.id);
  }

  // 07_inversion — scroll to the inversion / moment-of-truth copy so
  // the "raise monthly / extend horizon" sentence is the subject.
  try {
    const headline = page.locator('[data-testid="moment-of-truth"]');
    await headline.scrollIntoViewIfNeeded();
    await pause(page, 200);
    await page.evaluate(() => window.scrollBy(0, -80));
    await pause(page, 300);
  } catch {
    degraded.push("07_inversion: scroll failed; using current viewport");
  }
  await snap(page, "07_inversion");

  // 08_closing — pull back to show all three scenario cards again in
  // one frame (overview).
  try {
    const list = page.locator('[data-testid="scenario-cards"]');
    await list.scrollIntoViewIfNeeded();
    await pause(page, 300);
    await page.evaluate(() => window.scrollBy(0, -40));
    await pause(page, 300);
  } catch {
    degraded.push("08_closing: scroll failed; using current viewport");
  }
  await snap(page, "08_closing");

  return degraded;
}

/**
 * Run the simulation (click Run Simulation on the scenarios page) and
 * wait for the report URL. Captures no snaps itself — the report-level
 * snaps happen in captureReportShots.
 */
async function runSimulation(page: Page): Promise<void> {
  await page.evaluate(() =>
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "instant" as ScrollBehavior,
    })
  );
  await pause(page, 300);
  const btn = page.getByRole("button", {
    name: "Run Simulation",
    exact: true,
  });
  await Promise.all([
    page.waitForURL("**/clients/new/report", { timeout: 60000 }),
    btn.click(),
  ]);
}

/**
 * Extract per-scenario verdicts from the live report so we can
 * surface them in the capture log + propagate into the manifest. Reads
 * the exposed Redux store when available; otherwise parses
 * [data-testid="attainability-label"] out of each card.
 */
async function readVerdicts(
  page: Page
): Promise<{ id: string; scenarioName: string; attainability?: string; probability?: number }[]> {
  const results: {
    id: string;
    scenarioName: string;
    attainability?: string;
    probability?: number;
  }[] = [];
  for (let i = 0; i < SCENARIOS.length; i += 1) {
    const card = page.locator(`[data-testid="scenario-card-${i}"]`);
    const spec = SCENARIOS[i];
    let attainability: string | undefined;
    let probability: number | undefined;
    try {
      const label = await card
        .locator('[data-testid="attainability-label"], [data-testid="attainability-pill"]')
        .first()
        .textContent({ timeout: 2000 });
      if (label) attainability = label.trim();
    } catch {
      /* fall through */
    }
    try {
      const probText = await card
        .locator('[data-testid="probability"], [data-testid="attainment-probability"]')
        .first()
        .textContent({ timeout: 2000 });
      if (probText) {
        const m = /([\d.]+)\s*%/.exec(probText);
        if (m) probability = Number.parseFloat(m[1]);
      }
    } catch {
      /* fall through */
    }
    // Fallback — scrape any % inside the card if test-ids aren't there.
    if (probability === undefined) {
      try {
        const anyPct = await card.locator("text=/\\d+\\s*%/").first().textContent({ timeout: 1500 });
        if (anyPct) {
          const m = /([\d.]+)\s*%/.exec(anyPct);
          if (m) probability = Number.parseFloat(m[1]);
        }
      } catch {
        /* non-fatal */
      }
    }
    results.push({
      id: spec.snapId,
      scenarioName: spec.name,
      attainability,
      probability,
    });
  }
  return results;
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

  console.log(`capture: ${NARRATED.length} narrated sections → ${ASSETS_DIR}`);
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
  let verdicts: Awaited<ReturnType<typeof readVerdicts>> = [];
  try {
    await capture00Brand(page);
    await capture01Intro(page);
    await walkToGoalsStep(page);
    await capture02Goals(page);
    scenarioCount = await capture03ScenarioSetup(page);

    // Read-back sanity check: the draftSlice scenarios should each have
    // the expected goalNames. Surface a degradation line if any scenario
    // came back with an empty selection (picker didn't save).
    try {
      const persisted = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const redux = (window as any).__MARSA_DEBUG_STORE__;
        if (!redux) return null;
        const state = redux.getState();
        return (
          state?.draft?.scenarios?.map((s: { goalNames: string[] }) => s.goalNames) ??
          null
        );
      });
      if (persisted) {
        for (let i = 0; i < SCENARIOS.length; i += 1) {
          const got = persisted[i] || [];
          const want = SCENARIOS[i].goalNames;
          const matches =
            got.length === want.length && want.every((n: string) => got.includes(n));
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

    await runSimulation(page);
    const reportDegraded = await captureReportShots(page);
    degraded.push(...reportDegraded);
    verdicts = await readVerdicts(page);
  } catch (err) {
    console.error("capture: flow failed", err);
    degraded.push(`fatal: ${(err as Error).message.slice(0, 200)}`);
  }

  await page.close();
  await context.close();
  await browser.close();

  // Resolve per-section durations. If voiceover.manifest.json exists
  // (from a prior TTS pass) and covers this section id, use its
  // measured MP3 duration; otherwise fall back to the word-count
  // heuristic defaultDurationMs from sections.mjs.
  const voiceManifestPath = resolve(SRC_DIR, "voiceover.manifest.json");
  let voiceSections: { id: string; duration_ms: number }[] = [];
  if (existsSync(voiceManifestPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vm = require(voiceManifestPath);
      voiceSections = vm?.en?.sections ?? [];
    } catch (err) {
      console.warn(
        `capture: voiceover manifest unreadable — ${(err as Error).message.slice(0, 120)}; using word-count durations`
      );
    }
  }

  const sectionsOut = NARRATED.map((s) => {
    const vs = voiceSections.find((x) => x.id === s.id);
    const duration_ms =
      vs && vs.duration_ms > 0
        ? vs.duration_ms
        : (defaultDurationMs as (t: string) => number)(s.text);
    return { id: s.id, caption: s.text, duration_ms };
  });

  // Write walkthrough manifest. Caption is taken verbatim from
  // sections.mjs so the Remotion composition (which also imports
  // sections.mjs) can cross-check; they should always be identical.
  const manifestPath = resolve(SRC_DIR, "walkthrough.manifest.json");
  const totalMs = sectionsOut.reduce((s, sec) => s + sec.duration_ms, 0);
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        lang: "en",
        total_ms: totalMs,
        sections: sectionsOut,
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    `capture: manifest → ${manifestPath} (${NARRATED.length} sections, ${totalMs} ms)`
  );

  const took = ((Date.now() - start) / 1000).toFixed(1);
  // Expected frame ids = every FRAME_NEEDED entry that's true. That
  // naturally covers the three 01_intro_{a,b,c} sub-frames which don't
  // appear in NARRATED but do have a true flag in the map.
  const expectedFrameIds = Object.keys(FRAME_NEEDED).filter(
    (id) => FRAME_NEEDED[id] === true
  );
  const assetNames = readdirSync(ASSETS_DIR);
  const missing = expectedFrameIds.filter(
    (id) => !assetNames.includes(`frame.${id}.png`)
  );
  if (missing.length > 0) {
    degraded.push(`missing frames: ${missing.join(", ")}`);
  }
  console.log(
    `capture: done in ${took}s — ${scenarioCount}/${SCENARIOS.length} scenarios filled`
  );
  if (verdicts.length > 0) {
    console.log("capture: scenario verdicts (from live report):");
    for (const v of verdicts) {
      const p = v.probability !== undefined ? `${v.probability.toFixed(1)}%` : "?";
      const a = v.attainability ?? "?";
      console.log(`  - ${v.id} "${v.scenarioName}": ${a} (${p})`);
    }
  }
  if (degraded.length > 0) {
    console.log("capture: degradations:");
    for (const d of degraded) console.log(`  - ${d}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
