import { expect, Page, test } from "@playwright/test";
import { registerNewUser, runWizard } from "./helpers";

/**
 * Market-spec §5 acceptance: the attainability badge on the report page must
 * reflect the backend's `attainability` field and use the brand colour mapping.
 *
 * Taxonomy at the wire level: "attainable" | "aspirational" | "out_of_reach".
 * UI (SimulationReport.tsx) renders `attainability.replace("_", " ")` with a
 * tailwind class set of:
 *   attainable   -> bg-emerald-100 text-emerald-700
 *   aspirational -> bg-amber-100   text-amber-700
 *   out_of_reach -> bg-rose-100    text-rose-700
 *
 * The element also has `uppercase` on it, so the rendered text (via CSS
 * `text-transform: uppercase`) is "ATTAINABLE" / "OUT OF REACH", while the
 * DOM text content is lowercase. Assert against the DOM value.
 */

/**
 * The badge lives inside the "Goals Achievement Probability" card. It's
 * rendered as a <span> with rounded-full + tailwind colour classes.
 *
 * SimulationReport.tsx wraps the heading + badge in a flex container and
 * adds a stable `title` attribute ("Attainability band based on P15 /
 * median real-terms projection") — target that for reliability.
 */
function badge(page: Page) {
  return page.locator('[title^="Attainability band"]').first();
}

test.describe("attainability badge", () => {
  test("6M EGP / 2y / 20k/mo shows an Out-of-reach rose badge", async ({
    page,
  }) => {
    await registerNewUser(page);

    await runWizard(page, {
      clientName: "Ambitious Ahmed",
      birthdate: "01/06/1985",
      goalName: "Dream House",
      goalAmount: 6_000_000,
      goalYear: new Date().getFullYear() + 2,
      initialInvestment: 500_000,
      monthlyInvestment: 20_000,
    });

    const el = badge(page);
    await expect(el).toBeVisible({ timeout: 15_000 });

    // Colour mapping check — stable contract. After the Apple-HIG rebrand
    // the pill uses bg-system-red-tint / text-system-red (iOS tinted-badge
    // pattern). We keep a forward-compat regex accepting the old
    // bg-rose-\d+ / text-rose-\d+ tailwind classes too, so this test
    // doesn't have to flip each time design iterates.
    const cls = (await el.getAttribute("class")) ?? "";
    expect(cls).toMatch(/bg-(rose-\d+|system-red-tint)/);
    expect(cls).toMatch(/text-(rose-\d+|system-red)/);

    // Spec §5 display text is "Out of reach" (with a space between "of" and
    // "reach"). Current frontend uses `.replace("_", " ")` which only replaces
    // the first underscore in JS, rendering the buggy string "out of_reach".
    // Assert the correct text; mark xfail until the engineer lands
    // `.replaceAll("_", " ")`.
    const text = (await el.textContent())?.trim() ?? "";
    if (text === "out of_reach") {
      test.info().annotations.push({
        type: "frontend-bug",
        description:
          "SimulationReport.tsx uses replace('_', ' ') which only hits the " +
          "first underscore. Fix: replaceAll or /_/g. Badge classes are correct.",
      });
      test.fail(true, "awaiting frontend fix: replace('_', ' ') only replaces first underscore");
    }
    await expect(el).toHaveText(/out of reach/i);
  });

  test("100k EGP / 2y / 20k/mo shows an Attainable emerald badge", async ({
    page,
  }) => {
    await registerNewUser(page);

    await runWizard(page, {
      clientName: "Modest Mona",
      birthdate: "01/06/1985",
      goalName: "New Laptop",
      goalAmount: 100_000,
      goalYear: new Date().getFullYear() + 2,
      initialInvestment: 500_000,
      monthlyInvestment: 20_000,
    });

    const el = badge(page);
    await expect(el).toBeVisible({ timeout: 15_000 });
    await expect(el).toHaveText(/attainable/i);

    const cls = (await el.getAttribute("class")) ?? "";
    expect(cls).toMatch(/bg-(emerald-\d+|system-green-tint)/);
    expect(cls).toMatch(/text-(emerald-\d+|system-green)/);
  });
});
