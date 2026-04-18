import { expect, Page, test } from "@playwright/test";
import { registerNewUser } from "./helpers";

/**
 * UX has landed the disclosure banner on the simulation report
 * (SimulationReport.tsx -> <DisclosureBanner data-testid="simulation-disclosure"/>).
 * This test hard-asserts the element is present and visible on every run;
 * the previous graceful-skip branch was removed in the iteration-2 QA
 * validation pass (see docs/readiness.md).
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
  await page
    .getByRole("button", { name: /^(save|proceed to goals)$/i })
    .click();
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

    // Stable testid is the contract; hard-fail if missing.
    const banner = page.getByTestId("simulation-disclosure");
    await expect(banner).toBeVisible();
  });
});
