type Props = Readonly<{
  /** Percent on [0, 100]. Values outside the range are clamped. */
  percent: number;
  /**
   * Standard-error "pp" string, already formatted (e.g. "0.5"). When
   * present we append "± {seTail} pp" to the numeric label and draw
   * short tick marks bracketing the filled edge to indicate the CI
   * width. Pass `null` to suppress both.
   */
  seTail?: string | null;
  /**
   * Optional label override — when the caller wants to show "< 1%"
   * instead of the rounded "~0%" for a sub-percent scenario.
   */
  label?: string;
  /** Optional localised prefix for the aria-label ("Probability"). */
  ariaPrefix?: string;
}>;

/**
 * Editorial probability bar. A static document-style element, not an
 * animated dashboard widget:
 *
 *   ────────────────────────────────── rule (bg-rule), 2px tall
 *   ██████████                         fill (bg-accent), same 2px
 *
 *   42%   ± 0.5 pp                     numeric label below, tabular-nums
 *
 * When an SE tail is supplied, short vertical ticks bracket the filled
 * edge to show the CI width. No hover, no transition — the bar renders
 * once and sits still.
 *
 * The numeric label is marked `data-testid="probability-bar-label"` so
 * e2e tests can read the rendered percent without relying on SVG text.
 * That testid is the stable contract; the DOM shape above it is not.
 */
export default function ProbabilityBar({
  percent,
  seTail = null,
  label,
  ariaPrefix = "Probability",
}: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const rounded = Math.round(p);
  const text = label ?? `${rounded}%`;
  // Width of the CI bracket, in percent of the bar width. The SE is
  // already in percentage-points — e.g. "0.5" means ±0.5 pp around `p`.
  // Parsing guards against "0.5" coming in as a string (which it is).
  const seNumPp = seTail != null ? Number(seTail) : 0;
  const hasTicks = seTail != null && Number.isFinite(seNumPp) && seNumPp > 0;
  const leftEdge = Math.max(0, p - seNumPp);
  const rightEdge = Math.min(100, p + seNumPp);
  return (
    <div
      role="img"
      aria-label={`${ariaPrefix} ${rounded} percent`}
      className="w-full"
    >
      <div className="relative h-0.5 w-full bg-rule" aria-hidden="true">
        <div
          className="absolute inset-y-0 start-0 bg-accent"
          style={{ width: `${p}%` }}
        />
        {hasTicks && (
          <>
            {/*
              Two 6px ticks — one at the lower CI bound, one at the
              upper. Positioned with `calc(... - 0.5px)` so the tick
              centres on the percentage exactly (the tick is 1px wide).
              Opacity 0.6 so they read as a secondary annotation, not a
              second data layer.
            */}
            <div
              className="absolute w-px h-2 bg-ink/60"
              style={{ left: `calc(${leftEdge}% - 0.5px)`, top: "-3px" }}
            />
            <div
              className="absolute w-px h-2 bg-ink/60"
              style={{ left: `calc(${rightEdge}% - 0.5px)`, top: "-3px" }}
            />
          </>
        )}
      </div>
      <div
        className="mt-2 text-sm text-ink tabular flex items-baseline gap-2"
        data-testid="probability-bar-label"
      >
        <span className="font-medium">{text}</span>
        {seTail && (
          <span className="text-ink-muted text-xs">± {seTail} pp</span>
        )}
      </div>
    </div>
  );
}
