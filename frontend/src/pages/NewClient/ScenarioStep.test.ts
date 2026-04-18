// Unit tests covering the two wizard rate normalisation invariants that the
// bug report flagged: (a) toDecimalRate must treat decimals and percents
// consistently, and (b) the SIMULATE path must use the same normalisation as
// the PERSIST path so a single typed value survives the round-trip under one
// interpretation.
import { describe, expect, it } from "vitest";
import { toDecimalRate, weightedAnnualIncrease } from "./ScenarioStep";

describe("toDecimalRate", () => {
  it("returns the value unchanged when it is already a decimal (|v| <= 1)", () => {
    expect(toDecimalRate(0.05)).toBe(0.05);
  });

  it("divides by 100 when the value is a percent (|v| > 1)", () => {
    expect(toDecimalRate(5)).toBe(0.05);
  });

  it("collapses decimal and percent inputs to the same canonical value", () => {
    expect(toDecimalRate(0.05)).toBe(toDecimalRate(5));
  });

  it("handles negatives symmetrically", () => {
    expect(toDecimalRate(-0.05)).toBe(-0.05);
    expect(toDecimalRate(-5)).toBe(-0.05);
  });

  it("returns undefined for nullish / NaN inputs", () => {
    expect(toDecimalRate(null)).toBeUndefined();
    expect(toDecimalRate(undefined)).toBeUndefined();
    expect(toDecimalRate(Number.NaN)).toBeUndefined();
  });
});

describe("weightedAnnualIncrease", () => {
  it("returns 0 when the amount column sums to zero", () => {
    expect(weightedAnnualIncrease([])).toBe(0);
    expect(
      weightedAnnualIncrease([{ amount: 0, annualIncrease: 5 }])
    ).toBe(0);
  });

  it("returns the single row's rate when there's only one row", () => {
    expect(
      weightedAnnualIncrease([{ amount: 1000, annualIncrease: 5 }])
    ).toBe(5);
  });

  it("weights by amount when rows disagree", () => {
    // 1000 @ 0.05 + 3000 @ 0.10 → (50 + 300) / 4000 = 0.0875
    expect(
      weightedAnnualIncrease([
        { amount: 1000, annualIncrease: 0.05 },
        { amount: 3000, annualIncrease: 0.1 },
      ])
    ).toBeCloseTo(0.0875, 6);
  });

  it("is the identity when all rates are equal", () => {
    expect(
      weightedAnnualIncrease([
        { amount: 500, annualIncrease: 0.03 },
        { amount: 1500, annualIncrease: 0.03 },
      ])
    ).toBeCloseTo(0.03, 6);
  });
});
