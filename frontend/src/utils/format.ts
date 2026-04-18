// Centralised EGP currency + percentage formatters. All monetary UI on the
// advisor app should render through these helpers so we can change locale,
// precision, or the compact-notation rule in one place. Backend responses
// are never re-shaped here — format at render time only.

export const fmtEGP = (value: number, opts: { compact?: boolean } = {}) => {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value);
};

export const fmtPct = (value: number | null) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
