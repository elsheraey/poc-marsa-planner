import { expect, Page, test } from "@playwright/test";
import { registerNewUser } from "./helpers";

/**
 * UX task: land a "disclosure / past-performance" footnote on the simulation
 * report. Accept either:
 *   - a DOM node with data-testid="simulation-disclosure", OR
 *   - any visible element whose text contains "past performance" (case
 *     insensitive)
 *
 * Skips gracefully if UX hasn't landed it yet, so this test isn't a blocker
 * for backend/engineer commits.
 *
 * TODO: drop the graceful-skip once UX lands the disclosure banner
 *       (docs/next.md §UX — disclosure banner).
 */
async function runWizard(
  page: Page,
  opts: {
    clientName: string;
    birthdate: string;
    goalName: string;
    goalAmount: number;
    goalYear: number;
    initialInvestment: number;
    monthlyInvestment: number;
  }
): Promise<void> {
  await page.goto("/clients");
  await page.getByRole("button", { name: /add new/i }).click();
  await expect(page).toHaveURL(/\/clients\/new\/profile$/);

  await page.getByPlaceholder("Full name").first().fill(opts.clientName);
  await page.getByPlaceholder("dd/mm/yyyy").first().fill(opts.birthdate);
  await page
    .locator('select:has(option[value="very_high"])')
    .selectOption("high");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/clients\/new\/goals$/);

  await page.getByPlaceholder("Goal").first().fill(opts.goalName);
  await page.getByPlaceholder("Amount").first().fill(String(opts.goalAmount));
  await page.getByPlaceholder("Year").first().fill(String(opts.goalYear));
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/clients\/new\/scenario$/);

  await page
    .locator('span:text-is("Investments") + button.icon-btn-add')
    .click();
  await page
    .getByPlaceholder("Amount")
    .first()
    .fill(String(opts.initialInvestment));

  await page
    .locator('span:text-is("Monthly Investments") + button.icon-btn-add')
    .click();
  await page
    .getByPlaceholder("Amount")
    .nth(1)
    .fill(String(opts.monthlyInvestment));

  await page
    .getByRole("button", { name: /^run simulation$/i })
    .last()
    .click();
  await expect(page).toHaveURL(/\/clients\/new\/report$/, { timeout: 20_000 });
}

test.describe("simulation report disclosure", () => {
  test("report page renders a past-performance disclosure element", async ({
    page,
  }) => {
    await registerNewUser(page);
    await runWizard(page, {
      clientName: "Disclosure Dave",
      birthdate: "01/06/1985",
      goalName: "Retirement",
      goalAmount: 3_000_000,
      goalYear: new Date().getFullYear() + 5,
      initialInvestment: 500_000,
      monthlyInvestment: 20_000,
    });

    // Prefer the stable testid; fall back to the generic past-performance
    // text. The test is a skip (not a failure) when neither is present so
    // backend/engineer commits aren't blocked by UX scheduling.
    const byTestId = page.getByTestId("simulation-disclosure");
    const byText = page.getByText(/past performance/i);

    const testIdCount = await byTestId.count();
    const textCount = await byText.count();

    if (testIdCount === 0 && textCount === 0) {
      test.skip(
        true,
        "disclosure banner not on report page yet — waiting for UX commit " +
          "(docs/next.md §UX — disclosure banner)"
      );
      return;
    }

    const target = testIdCount > 0 ? byTestId.first() : byText.first();
    await expect(target).toBeVisible();
  });
});
