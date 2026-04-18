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
