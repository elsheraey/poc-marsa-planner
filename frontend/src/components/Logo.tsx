import { APP_NAME } from "../config";

type Props = Readonly<{ variant?: "light" | "dark"; className?: string }>;

/**
 * Marsa wordmark.
 *
 * Apple-style wordmark: SF-semibold, tight tracking, inherits text colour
 * from context so it can sit on a light or dark surface. No glyph, no
 * serif. `variant="light"` flips to white for rare dark-surface placement
 * (not used in the current app, but the prop is retained for callers).
 */
export default function Logo({ variant = "dark", className = "" }: Props) {
  const colour = variant === "light" ? "text-white" : "text-label";
  return (
    <span
      className={`font-display text-[17px] font-semibold tracking-tight ${colour} ${className}`}
      aria-label={APP_NAME}
    >
      {APP_NAME}
    </span>
  );
}
