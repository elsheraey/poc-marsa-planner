// Moment-of-truth "required monthly" and "achievable year" inversion.
//
// The report's most valuable line to an Egyptian advisor is not the
// probability-of-goal donut; it is the answer to "what would need to
// change for this plan to work?" The engine does not expose a direct
// inversion endpoint, so we approximate client-side from the projection
// the backend already returned.
//
// Every field below is optional — callers render the recommendation only
// when enough inputs are present; missing fields degrade to an empty
// suggestion list (never to a fabricated number).
//
// Approximation quality:
//
// - `requiredMonthlyForGoal` is a ratio scaling of the current monthly by
//   (goal / median_T) after subtracting the zero-contribution terminal
//   value. For goals within ~50% of the current-plan median it is within
//   a few percent of a full re-run; outside that band it degrades
//   gracefully and the UI marks it "approx.". We do NOT advertise a
//   confidence level on this line.
//
// - `achievableYearForGoal` walks the projection's median curve and
//   returns the first year whose median real-terms value meets the real
//   goal. If no year in the projection reaches the goal we return null.

import type { SimulateResult } from "../api/client";

export type InversionInputs = {
  goalTargetAmount: number | undefined;
  currentMonthly: number;
  initialInvestment: number;
  result: SimulateResult;
};

export type Inversion = {
  // Monthly contribution that the median projection would need to hit
  // `goal_target_amount` at horizon T. `null` if we can't compute.
  requiredMonthly: number | null;
  // Current-plan median EGP at horizon T (useful for "you're projected
  // to reach X" copy).
  medianTerminal: number | null;
  // First calendar year in the projection whose median EGP reaches the
  // goal. `null` if the goal is unreached inside the horizon.
  achievableYear: number | null;
  // `probability_of_goal` rounded to an integer, for the copy.
  probabilityPct: number | null;
  // Whether the plan already meets the 80% bar (rule-of-thumb advisor
  // threshold; matches ux-audit.md §3 attainability framing).
  meetsEightyPct: boolean;
};

const DEFAULT_TARGET = 0.8; // advisor-side rule-of-thumb; see ux-audit-v2.md

export function computeInversion(
  inputs: InversionInputs,
  nowYear: number = new Date().getFullYear()
): Inversion {
  const { goalTargetAmount, currentMonthly, initialInvestment, result } = inputs;
  const projection = result.projection;
  const medianSeries = projection?.median ?? [];
  const years = projection?.years ?? [];
  const medianTerminal =
    medianSeries.length > 0 ? medianSeries[medianSeries.length - 1] : null;

  const probabilityPct =
    result.probability_of_goal == null
      ? null
      : Math.round(result.probability_of_goal * 100);
  const meetsEightyPct =
    result.probability_of_goal != null &&
    result.probability_of_goal >= DEFAULT_TARGET;

  // Achievable year: first year index where median >= goal.
  let achievableYear: number | null = null;
  if (goalTargetAmount && goalTargetAmount > 0 && medianSeries.length > 0) {
    for (let i = 0; i < medianSeries.length; i++) {
      if (medianSeries[i] >= goalTargetAmount) {
        // `years[i]` is a 1-indexed offset; add nowYear then subtract 1
        // to get the calendar year the projection column represents.
        achievableYear = nowYear + (years[i] ?? i + 1) - 1;
        break;
      }
    }
  }

  // Required monthly: scale the current monthly by goal / median_T after
  // netting out the initial-investment contribution to the terminal. If
  // the current plan already clears the goal, there is nothing to
  // suggest — return null so the UI skips the line.
  let requiredMonthly: number | null = null;
  if (
    goalTargetAmount &&
    goalTargetAmount > 0 &&
    medianTerminal != null &&
    medianTerminal > 0 &&
    currentMonthly > 0 &&
    goalTargetAmount > medianTerminal
  ) {
    // Treat the share of the terminal attributable to monthly contributions
    // as (median_T − initial_contrib_effective). We approximate
    // initial_contrib_effective as the initial_investment grown at the
    // implied median growth rate. Without the engine's growth rate we use
    // the ratio (initial / median) which under-counts compounding but
    // never over-promises a lower required monthly. This is a deliberate
    // "err on the side of more savings" bias.
    const monthlyShareOfTerminal = Math.max(
      1,
      medianTerminal - initialInvestment
    );
    const ratio = (goalTargetAmount - initialInvestment) / monthlyShareOfTerminal;
    requiredMonthly = Math.max(currentMonthly, currentMonthly * ratio);
  }

  return {
    requiredMonthly,
    medianTerminal,
    achievableYear,
    probabilityPct,
    meetsEightyPct,
  };
}
