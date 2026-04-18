import { describe, it, expect } from "vitest";
import { fmtEGP, fmtPct, fmtProbabilitySeTail } from "./format";

describe("fmtEGP", () => {
  it("returns an em-dash for non-finite values", () => {
    expect(fmtEGP(Number.NaN)).toBe("—");
    expect(fmtEGP(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("formats integers with EGP currency markers", () => {
    // Intl uses ar-EG which renders Arabic-Indic digits and the "ج.م"
    // abbreviation or the ISO "EGP" symbol depending on ICU version.
    const s = fmtEGP(123456);
    expect(s).toMatch(/EGP|ج\.?\s?م/);
    // Some digit somewhere — either Western or Arabic-Indic.
    expect(s).toMatch(/[0-9\u0660-\u0669\u06F0-\u06F9]/);
  });

  it("switches to compact notation when requested", () => {
    const s = fmtEGP(1_500_000, { compact: true });
    expect(s.length).toBeLessThan(fmtEGP(1_500_000).length);
  });

  it("drops fractional digits", () => {
    expect(fmtEGP(1000.7)).not.toMatch(/\.7/);
  });
});

describe("fmtPct", () => {
  it("returns em-dash for null", () => {
    expect(fmtPct(null)).toBe("—");
  });

  it("formats decimals as percent with at most one fraction digit", () => {
    expect(fmtPct(0.5)).toBe("50%");
    expect(fmtPct(0.123)).toBe("12.3%");
  });
});

describe("fmtProbabilitySeTail", () => {
  it("returns null for null / undefined SE", () => {
    expect(fmtProbabilitySeTail(null)).toBeNull();
    expect(fmtProbabilitySeTail(undefined)).toBeNull();
  });

  it("returns null for exact zero (don't fabricate a tail)", () => {
    expect(fmtProbabilitySeTail(0)).toBeNull();
  });

  it("returns null for sub-threshold SE (< 0.001 decimal = < 0.1 pp)", () => {
    // 0.05 pp would round to 0.1 pp on display, which reads as spurious
    // precision on an N=10k Monte Carlo estimate.
    expect(fmtProbabilitySeTail(0.0005)).toBeNull();
  });

  it("rounds measurable SE to one fractional pp digit", () => {
    expect(fmtProbabilitySeTail(0.005)).toBe("0.5");
    expect(fmtProbabilitySeTail(0.05)).toBe("5.0");
    expect(fmtProbabilitySeTail(0.012)).toBe("1.2");
  });

  it("ignores non-finite values", () => {
    expect(fmtProbabilitySeTail(Number.NaN)).toBeNull();
    expect(fmtProbabilitySeTail(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
