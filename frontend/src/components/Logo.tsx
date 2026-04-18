import { APP_NAME } from "../config";

type Props = Readonly<{ variant?: "light" | "dark"; className?: string }>;

/**
 * Marsa wordmark.
 *
 * Azimut-style wordmark: Cairo 600 weight, tight tracking, inherits text
 * colour from context so it can sit on a light or dark surface. No glyph,
 * no serif. `variant="light"` renders white for placement on the black
 * top nav; default is `az-ink` for light surfaces like the auth cards.
 */
export default function Logo({ variant = "dark", className = "" }: Props) {
  const colour = variant === "light" ? "text-az-white" : "text-az-ink";
  return (
    <span
      className={`font-display text-[17px] font-semibold tracking-tight ${colour} ${className}`}
      aria-label={APP_NAME}
    >
      {APP_NAME}
    </span>
  );
}
