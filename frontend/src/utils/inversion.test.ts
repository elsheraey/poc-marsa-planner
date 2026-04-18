import { describe, it, expect } from "vitest";
import { computeInversion } from "./inversion";
import type { SimulateResult } from "../api/client";

function mkResult(over: Partial<SimulateResult> = {}): SimulateResult {
  return {
    recommended: { variable_pct: 60, percentiles: {} },
    candidates: [],
    projection: {
      years: [1, 2, 3, 4, 5],
      pessimistic: [10000, 20000, 30000, 40000, 50000],
      median: [15000, 30000, 45000, 60000, 80000],
      optimistic: [25000, 45000, 70000, 100000, 120000],
    },
    probability_of_goal: 0.4,
    attainability: "aspirational",
    ...over,
  };
}

describe("computeInversion", () => {
  it("returns null recommendations when goal already met at terminal", () => {
    const inv = computeInversion({
      goalTargetAmount: 50_000,
      currentMonthly: 5000,
      initialInvestment: 100000,
      result: mkResult({ probability_of_goal: 0.95 }),
    });
    expect(inv.requiredMonthly).toBeNull();
    expect(inv.meetsEightyPct).toBe(true);
    expect(inv.probabilityPct).toBe(95);
    // Achievable year: year 1 median is 15k, year 5 is 80k; goal is 50k
    // (reached at index 3 → year 4).
    expect(inv.achievableYear).not.toBeNull();
  });

  it("recommends a higher monthly when goal exceeds terminal median", () => {
    const inv = computeInversion({
      goalTargetAmount: 200_000,
      currentMonthly: 5000,
      initialInvestment: 10_000,
      result: mkResult({ probability_of_goal: 0.25 }),
    });
    expect(inv.requiredMonthly).not.toBeNull();
    expect(inv.requiredMonthly!).toBeGreaterThan(5000);
    expect(inv.meetsEightyPct).toBe(false);
    expect(inv.achievableYear).toBeNull(); // 80k terminal < 200k goal
  });

  it("returns null when goalTargetAmount is undefined", () => {
    const inv = computeInversion({
      goalTargetAmount: undefined,
      currentMonthly: 5000,
      initialInvestment: 0,
      result: mkResult(),
    });
    expect(inv.requiredMonthly).toBeNull();
    expect(inv.achievableYear).toBeNull();
  });

  it("handles zero current monthly gracefully", () => {
    const inv = computeInversion({
      goalTargetAmount: 100_000,
      currentMonthly: 0,
      initialInvestment: 0,
      result: mkResult(),
    });
    // Can't scale from zero — null, not Infinity.
    expect(inv.requiredMonthly).toBeNull();
  });

  it("exposes medianTerminal even without a goal", () => {
    const inv = computeInversion({
      goalTargetAmount: undefined,
      currentMonthly: 0,
      initialInvestment: 0,
      result: mkResult(),
    });
    expect(inv.medianTerminal).toBe(80000);
  });
});
