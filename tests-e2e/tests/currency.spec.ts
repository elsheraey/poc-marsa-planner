import { expect, test } from "@playwright/test";
import { registerNewUser, runWizard } from "./helpers";

/**
 * UX task: all monetary values on the report page must render through the
 * EGP formatter. Exact rendering varies by locale/polyfill, so accept any
 * of the three known forms:
 *   1. Latin suffix          -> "EGP 6,000,000"
 *   2. Latin prefix          -> "1,234 E£"
 *   3. Arabic (ar-EG locale) -> "6٬000٬000 ج.م"  (U+066C thousands sep)
 *
 * Also accept the ASCII comma variant because Intl.NumberFormat in CI uses
 * a minimal ICU build that falls back to Latin digits + ASCII commas.
 *
 * This test runs the full wizard with the payload the QA task specifies:
 *   initial=500000, monthly=20000, goal=6000000, year=2028.
 *
 * TODO: expand assertion to require *every* numeric cell to format when
 *       UX lands the i18n scaffold (docs/next.md §UX — EGP formatting).
 */

test.describe("currency formatting on the report page", () => {
  test("report contains at least one EGP-formatted number", async ({
    page,
  }) => {
    await registerNewUser(page);

    await runWizard(page, {
      clientName: "Currency Client",
      birthdate: "01/06/1985",
      goalName: "House",
      goalAmount: 6_000_000,
      goalYear: 2028,
      initialInvestment: 500_000,
      monthlyInvestment: 20_000,
    });

    // Wait for the donut chart to prove the report is hydrated.
    await expect(
      page.getByRole("heading", { name: /goals achievement probability/i })
    ).toBeVisible();

    // Scrape the full body text; we then match against the three accepted
    // EGP shapes. Using body-level textContent avoids flakiness from the
    // chart / table toggle.
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();

    // Accepted shapes (JS \d does NOT match Arabic-Indic 0-9, so we spell
    // out [0-9٠-٩] as our "digit" class explicitly):
    //   /EGP\s?[0-9٠-٩]/
    //   /[0-9٠-٩]\s?E£/
    //   /[0-9٠-٩]{1,3}([٬,][0-9٠-٩]{3})+\s?(EGP|ج\.م)/   <- grouped Latin or Arabic
    //
    // Real Intl(ar-EG) output for 6,000,000 is "\u200F٦٬٠٠٠٬٠٠٠ ج.م.\u200F"
    // (Arabic-Indic digits, Arabic thousands mark U+066C, RTL markers, and
    // a trailing full-stop on ج.م.). The third pattern covers it.
    const patterns = [
      /EGP\s?[0-9\u0660-\u0669]/,
      /[0-9\u0660-\u0669]\s?E£/,
      /[0-9\u0660-\u0669]{1,3}([,\u066C][0-9\u0660-\u0669]{3})+\s?\.?\s?(EGP|ج\.م)/u,
    ];
    const matched = patterns.some((re) => re.test(body ?? ""));

    if (!matched) {
      // Emit a diagnostic snippet so the CI log is actionable when this
      // test fails — we want the first ~300 chars of the body to help
      // frontend debug locale output (e.g. if Intl falls back to en-US).
      const snippet = (body ?? "").slice(0, 300).replaceAll(/\s+/g, " ");
      test.info().annotations.push({
        type: "egp-format-missing",
        description: `no EGP-formatted number detected. body[:300]="${snippet}"`,
      });
    }
    expect(matched, "expected at least one EGP-formatted number on the report").toBe(true);
  });
});
