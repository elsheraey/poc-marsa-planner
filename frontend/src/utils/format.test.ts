import { describe, it, expect } from "vitest";
import { fmtEGP, fmtPct } from "./format";

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
