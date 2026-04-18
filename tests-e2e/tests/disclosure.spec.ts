import { expect, test } from "@playwright/test";
import { registerNewUser, runWizard } from "./helpers";

/**
 * UX has landed the disclosure banner on the simulation report
 * (SimulationReport.tsx -> <DisclosureBanner data-testid="simulation-disclosure"/>).
 * This test hard-asserts the element is present and visible on every run;
 * the previous graceful-skip branch was removed in the iteration-2 QA
 * validation pass (see docs/readiness.md).
 */

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
