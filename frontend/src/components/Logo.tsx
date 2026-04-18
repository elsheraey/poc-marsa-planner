import { APP_NAME } from "../config";

type Props = Readonly<{ variant?: "light" | "dark"; className?: string }>;

// Marsa wordmark. A clean sans-serif product name (`APP_NAME`) set in the
// current text colour, preceded on the logical-start side by a small
// ochre anchor-curve mark — a half-arc with a centred dot, evoking a
// ship's mooring at the harbor (the brand's meaning in Arabic).
//
// Design constraints honoured:
// - No cartoon charts, purple rectangles, or pink circles.
// - Sits credibly next to a Bloomberg terminal: geometric, two colours,
//   no gradients, no decoration.
// - RTL-safe: `inline-flex flex-row` + `ms-*`/`me-*` logical properties
//   mean the mark always appears on the "start" side of the wordmark.
// - SVG is ~20 lines of markup (arc + dot + crossbar).
export default function Logo({ variant = "dark", className = "" }: Props) {
  const wordColor = variant === "light" ? "text-white" : "text-primary-900";
  // Ochre reads well on both the navy hero and the warm off-white
  // surface, so we use a single mark colour for both variants.
  const markColor = "#D4A24C";
  return (
    <div
      className={`inline-flex flex-row items-center ${className}`}
      aria-label={APP_NAME}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 me-2"
      >
        {/* Open half-arc: the mooring curve. */}
        <path
          d="M4 9 A 8 8 0 0 0 20 9"
          stroke={markColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Short vertical stem dropping from the arc's apex. */}
        <path
          d="M12 9 L 12 17"
          stroke={markColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Mooring dot at the stem's base. */}
        <circle cx="12" cy="18.5" r="1.6" fill={markColor} />
      </svg>
      <span
        className={`text-xl font-extrabold tracking-tight ${wordColor}`}
      >
        {APP_NAME}
      </span>
    </div>
  );
}
