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
 * Azimut-style probability bar. Plain horizontal track (h-2, az-separator,
 * rounded-full) with a gold fill; two small vertical ticks bracket the
 * CI bounds when an SE tail is provided. Numeric label sits below the
 * bar in semibold az-ink with a muted "± x pp" tail.
 *
 * No animation, no hover state. Percent is computed once and rendered
 * once. The label element carries `data-testid="probability-bar-label"`;
 * that testid is the e2e contract.
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
  // CI bracket width in percent. The SE is already in percentage
  // points ("0.5" means ±0.5 pp around `p`). Parsing guards against
  // the string form coming through from the formatter.
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
      <div
        className="relative h-2 w-full rounded-full bg-az-separator"
        aria-hidden="true"
      >
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-az-gold"
          style={{ width: `${p}%` }}
        />
        {hasTicks && (
          <>
            {/*
              CI ticks. 1px wide, bracket the filled edge. Colour is
              az-ink-muted so the ticks read as a secondary annotation
              rather than a second data layer.
            */}
            <div
              className="absolute w-px h-3 bg-az-ink-muted"
              style={{ left: `calc(${leftEdge}% - 0.5px)`, top: "-2px" }}
            />
            <div
              className="absolute w-px h-3 bg-az-ink-muted"
              style={{ left: `calc(${rightEdge}% - 0.5px)`, top: "-2px" }}
            />
          </>
        )}
      </div>
      <div
        className="mt-1.5 text-sm tabular flex items-baseline gap-2"
        data-testid="probability-bar-label"
      >
        <span className="font-semibold text-az-ink">{text}</span>
        {seTail && (
          <span className="text-az-ink-muted text-xs">± {seTail} pp</span>
        )}
      </div>
    </div>
  );
}
