import { Page, expect } from "@playwright/test";

/**
 * Generate a unique email for each test run so repeated runs don't collide
 * with users already in the backend DB.
 */
export function uniqueEmail(prefix = "qa"): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${stamp}-${rand}@example.com`;
}

/**
 * Register a new user via the UI and land on /clients.
 * Returns the credentials used so the caller can log back in.
 */
export async function registerNewUser(
  page: Page,
  opts: { name?: string; password?: string } = {}
): Promise<{ name: string; email: string; password: string }> {
  const creds = {
    name: opts.name ?? "QA Tester",
    email: uniqueEmail(),
    password: opts.password ?? "Hunter2Hunter2!",
  };
  await page.goto("/register");
  await page.locator("#reg-name").fill(creds.name);
  await page.locator("#reg-email").fill(creds.email);
  await page.locator("#reg-password").fill(creds.password);
  await page.locator("#reg-confirm").fill(creds.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/clients(\?|$)/);
  return creds;
}

/**
 * Extract the first probability percent (e.g. "42%" -> 42) rendered on
 * the simulation report page. Waits for at least one to be visible
 * before reading.
 *
 * Post-rebrand the report replaced the DonutChart with a ProbabilityBar
 * — a flat editorial bar with the percent rendered in a div labelled
 * `data-testid="probability-bar-label"`. The earlier implementation
 * looked for `svg text` inside the donut; we now read the div label
 * directly. The leading "~" is optional so any intermediate artefact
 * still parses.
 */
export async function readFirstProbabilityPercent(page: Page): Promise<number> {
  const barLabel = page.getByTestId("probability-bar-label").first();
  await expect(barLabel).toBeVisible({ timeout: 15_000 });
  const raw = (await barLabel.textContent()) ?? "";
  const m = /~?([\d.]+)\s*%/.exec(raw);
  if (!m) throw new Error(`Could not parse percent from probability bar: ${raw}`);
  return Number(m[1]);
}

/**
 * Walk the new-client wizard (Profile -> Goals -> Scenario) and click
 * "Run Simulation". Expects the user to already be logged in.
 *
 * As of commit c040742 the Profile step was split into six always-visible
 * required fields (full name, email, birthdate, phone, employment status,
 * risk appetite) plus a collapsible advanced dossier. The CTA in
 * ScenarioStep.tsx (`runAll()`) guards on `trimmedName && profile.email`
 * — if either is empty it bounces the advisor back to /clients/new/profile
 * with a toast. The helper therefore must fill all six fields; missing
 * email in particular is what was breaking the suite.
 */
export interface WizardOpts {
  clientName: string;
  birthdate: string; // "dd/mm/yyyy"
  goalName: string;
  goalAmount: number;
  goalYear: number;
  initialInvestment: number;
  monthlyInvestment: number;
  /** Optional — uniqueEmail() if not provided. */
  email?: string;
  /** Optional — a plausible EG mobile if not provided. */
  phone?: string;
  /**
   * Optional — one of "employed" | "self-employed" | "retired" | "unemployed".
   * Anything truthy makes the select pass the backend ProfileIn check.
   */
  employmentStatus?: "employed" | "self-employed" | "retired" | "unemployed";
}

export async function runWizard(page: Page, opts: WizardOpts): Promise<void> {
  const ts = Date.now().toString(36);
  const email = opts.email ?? `client-${ts}@example.com`;
  const phone = opts.phone ?? "+201001234567";
  const employmentStatus = opts.employmentStatus ?? "employed";

  // Kick off the wizard fresh from the clients list.
  await page.goto("/clients");
  await page.getByRole("button", { name: /add new/i }).click();
  await expect(page).toHaveURL(/\/clients\/new\/profile$/);

  // --- Profile step — six required fields (c040742) ---
  // Name: first "Full name" input in the Personal Info card. The dossier
  // also has a "Full name" placeholder for the co-client, but it's behind
  // a <details> that stays closed by default, so `.first()` is fine.
  await page.getByPlaceholder("Full name").first().fill(opts.clientName);

  // Email: type=email, no placeholder, the only email input on the page.
  await page.locator('input[type="email"]').first().fill(email);

  // Birthdate: "dd/mm/yyyy" placeholder. Like full name there are more of
  // these in the dossier but the advanced section is collapsed by default.
  await page.getByPlaceholder("dd/mm/yyyy").first().fill(opts.birthdate);

  // Phone: no placeholder, no special type, and the Field wrapper renders
  //
  //   <div class="flex flex-col gap-1.5">
  //     <span>Phone<span> *</span></span>
  //     <input class="input" .../>
  //   </div>
  //
  // The label span's text is NOT exactly "Phone" (the inner "*" span splits
  // the text node), so `text-is("Phone")` won't fire. Use XPath to grab
  // the span whose *normalized* leading text contains "Phone" and then
  // walk to the sibling <input>.
  await page
    .locator(
      'xpath=//span[starts-with(normalize-space(.), "Phone")]/following-sibling::input[contains(@class, "input")]'
    )
    .first()
    .fill(phone);

  // Employment status: the only select whose options contain "unemployed"
  // (the co-client dossier select is hidden by default and also doesn't
  // include "unemployed").
  await page
    .locator('select:has(option[value="unemployed"])')
    .selectOption(employmentStatus);

  // Risk Appetite = high. The only <select> on the page whose options
  // include "very_high"; target via option-value selector.
  await page
    .locator('select:has(option[value="very_high"])')
    .selectOption("high");

  // Profile step CTA is "Proceed to Goals" post-rebrand; keep the /^save$/
  // fallback so this helper is resilient to any further copy churn.
  await page
    .getByRole("button", { name: /^(save|proceed to goals)$/i })
    .click();
  await expect(page).toHaveURL(/\/clients\/new\/goals$/);

  // --- Goals step ---
  await page.getByPlaceholder("Goal").first().fill(opts.goalName);
  await page.getByPlaceholder("Amount").first().fill(String(opts.goalAmount));
  await page.getByPlaceholder("Year").first().fill(String(opts.goalYear));

  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/clients\/new\/scenario$/);

  // --- Scenario step ---
  const addInvestmentBtn = page.locator(
    'span:text-is("Investments") + button.icon-btn-add'
  );
  await addInvestmentBtn.click();
  await page.getByPlaceholder("Amount").first().fill(String(opts.initialInvestment));

  const addMonthlyBtn = page.locator(
    'span:text-is("Monthly Investments") + button.icon-btn-add'
  );
  await addMonthlyBtn.click();
  await page.getByPlaceholder("Amount").nth(1).fill(String(opts.monthlyInvestment));

  await page
    .getByRole("button", { name: /^run simulation$/i })
    .last()
    .click();

  await expect(page).toHaveURL(/\/clients\/new\/report$/, { timeout: 20_000 });
}
