// Centralised EGP currency + percentage formatters. All monetary UI on the
// advisor app should render through these helpers so we can change locale,
// precision, or the compact-notation rule in one place. Backend responses
// are never re-shaped here — format at render time only.

import { getLocale } from "../i18n";

// BCP-47 locale tags. `ar-EG` renders Arabic-Indic digits and the "ج.م"
// currency symbol — only use it when the UI is actually in Arabic.
function numberLocale(): string {
  return getLocale() === "ar" ? "ar-EG" : "en-EG";
}

export const fmtEGP = (value: number, opts: { compact?: boolean } = {}) => {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(numberLocale(), {
    style: "currency",
    currency: "EGP",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value);
};

export const fmtPct = (value: number | null) =>
  value == null
    ? "—"
    : new Intl.NumberFormat(numberLocale(), {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);

/**
 * Format a standard-error tail for a probability estimate as a ± string in
 * percentage points (pp). The backend returns `probability_of_goal_se` as a
 * decimal on [0, 1]; this helper:
 *
 *  - returns `null` when SE is null/undefined (no tail to render),
 *  - returns `null` when SE in pp is below 0.001 (rounds to zero at one
 *    fractional digit; displaying "± 0.0 pp" reads as spurious precision),
 *  - otherwise returns the pp value rounded to one fractional digit as a
 *    string, e.g. `"0.5"`, `"5.0"`. Callers interpolate into
 *    `t("report.se.tail", { pp })` or similar.
 *
 * Keeping the formatting helper separate from the i18n string lets the
 * caller decide whether the "± X pp" chrome is italic, bold, tailed on the
 * headline, etc., while rounding logic lives in one place.
 */
/**
 * Format an ISO date/timestamp string with the active locale. Returns an
 * em-dash for empty / unparseable input so callers don't need to guard.
 *
 *   - ar → "ar-EG" (Arabic-Indic digits, Arabic month names)
 *   - en → "en-EG" (Western digits, English month names, day-month-year order)
 *
 * We deliberately render with locale — never `toISOString().slice(0,10)`
 * which forces UTC and silently shifts the day east of the dateline.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(numberLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function fmtProbabilitySeTail(seDecimal: number | null | undefined): string | null {
  if (seDecimal == null) return null;
  if (!Number.isFinite(seDecimal)) return null;
  const pp = seDecimal * 100;
  // Guard against the engine ever emitting a tiny non-zero SE that would
  // round to "0.0 pp" — the spec says treat anything < 0.001 (in decimal
  // terms; i.e. < 0.1 pp) as "don't bother the advisor".
  if (seDecimal < 0.001) return null;
  // One fractional digit is the right precision for display: the engine
  // SE is itself a Monte-Carlo estimate at N=10k, and showing two digits
  // would overstate how well-pinned the tail is.
  const rounded = Math.round(pp * 10) / 10;
  return rounded.toFixed(1);
}
