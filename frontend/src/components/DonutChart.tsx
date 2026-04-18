type Props = Readonly<{ percent: number; size?: number; stroke?: number; label?: string }>;

// Render an integer percent with a leading "~" to signal that N=10k Monte
// Carlo has a ±0.5 pp standard error — two-decimal precision was dishonest
// (market-spec §4c). Pass `label` to override the inner text (e.g. for a
// sub-percent case where "< 1%" reads better than "~0%").
export default function DonutChart({ percent, size = 110, stroke = 10, label }: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - p / 100);
  const text = label ?? `~${Math.round(p)}%`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Probability ${Math.round(p)} percent`}
    >
      <title>{`Probability ${Math.round(p)} percent`}</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#E5E7EB"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#5841D8"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="#1A1A2E"
      >
        {text}
      </text>
    </svg>
  );
}
