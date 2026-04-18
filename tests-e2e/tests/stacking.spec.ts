import { expect, test } from "@playwright/test";
import { registerNewUser, runWizard } from "./helpers";

/**
 * UX bug (commit a70ebd4 "fix(report): remove stackId causing
 * optimistic/median/pessimistic triple-count"): the Area chart stacked all
 * three bands additively, so the rendered "Optimistic" cell was
 * optimistic + median + pessimistic (always larger than any single band)
 * and "Median" was median + pessimistic.
 *
 * After the fix: each band renders its raw backend value (P85, P50, P15)
 * and the invariant is:
 *     optimistic >= median >= pessimistic  for every row
 *
 * We assert this on the *table* view (data-testid="row-${year}-${band}")
 * because the chart renders numbers into SVG paths where they aren't
 * directly inspectable.
 */

/**
 * Parse a formatted currency cell like "EGP 1,234,567", "1٬234٬567 ج.م",
 * "E£1234567", or "1.2M EGP" back to a Number. Strategy: strip everything
 * that isn't a digit, Arabic digit, decimal point, or "M/K" magnitude
 * suffix, then interpret.
 *
 * For non-compact output (our case — maximumFractionDigits:0, standard
 * notation) the result is integer-safe.
 */
function parseCurrencyCell(text: string): number {
  // Map Arabic-Indic digits to Latin; strip thousand-separators (ASCII
  // comma, Arabic thousands mark U+066C, narrow nbsp).
  const latinized = text
    .replaceAll(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replaceAll(/[,\u066C\u202F\u00A0\s]/g, "");
  const m = /(-?\d+(?:\.\d+)?)/.exec(latinized);
  if (!m) throw new Error(`Could not parse numeric value from cell: ${JSON.stringify(text)}`);
  return Number(m[1]);
}

test.describe("chart-stacking fix (optimistic >= median >= pessimistic)", () => {
  test("table view shows unstacked bands — optimistic >= median >= pessimistic every row", async ({
    page,
  }) => {
    await registerNewUser(page);
    await runWizard(page, {
      clientName: "Stacking Sam",
      birthdate: "01/06/1985",
      goalName: "House",
      goalAmount: 6_000_000,
      goalYear: 2028,
      initialInvestment: 500_000,
      monthlyInvestment: 20_000,
    });

    // Switch to the table view. The chart / table toggle is a pair of 9x8
    // buttons next to each other; the table one has title="Table".
    const tableBtn = page.getByRole("button", { name: "Table" }).first();
    if (await tableBtn.count() === 0) {
      // Fallback — the button has title="Table" on it rather than accessible
      // name.
      await page.locator('button[title="Table"]').first().click();
    } else {
      await tableBtn.click();
    }

    // Wait until at least one row renders using the stable testid contract.
    const firstOptimistic = page
      .locator('[data-testid$="-optimistic"]')
      .first();
    await expect(firstOptimistic).toBeVisible({ timeout: 10_000 });

    const optimisticCells = await page
      .locator('[data-testid$="-optimistic"]')
      .all();
    expect(optimisticCells.length).toBeGreaterThan(0);

    for (const opt of optimisticCells) {
      const tid = (await opt.getAttribute("data-testid")) ?? "";
      // row-<year>-optimistic -> year
      const m = /^row-(\d+)-optimistic$/.exec(tid);
      if (!m) throw new Error(`unexpected testid shape ${tid}`);
      const year = m[1];

      const optText = (await opt.textContent()) ?? "";
      const medText =
        (await page.getByTestId(`row-${year}-median`).textContent()) ?? "";
      const pesText =
        (await page.getByTestId(`row-${year}-pessimistic`).textContent()) ?? "";

      const optimistic = parseCurrencyCell(optText);
      const median = parseCurrencyCell(medText);
      const pessimistic = parseCurrencyCell(pesText);

      expect(
        optimistic,
        `year ${year}: optimistic (${optimistic}) should be >= median (${median})`
      ).toBeGreaterThanOrEqual(median);
      expect(
        median,
        `year ${year}: median (${median}) should be >= pessimistic (${pessimistic})`
      ).toBeGreaterThanOrEqual(pessimistic);
    }
  });
});
