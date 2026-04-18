import { APP_NAME } from "../config";

type Props = Readonly<{ variant?: "light" | "dark"; className?: string }>;

/**
 * Marsa wordmark.
 *
 * An editorial serif wordmark — nothing else. The previous iteration paired
 * a navy "Marsa" with an ochre mooring-anchor glyph; the new visual system
 * is a private-banker letterhead and a serif name is all the mark the
 * document needs.
 *
 * `variant="light"` flips the ink colour to cream for placement on a dark
 * surface (there are none left in the app, but the prop is retained so
 * callers don't break).
 */
export default function Logo({ variant = "dark", className = "" }: Props) {
  const colour = variant === "light" ? "text-paper" : "text-ink";
  return (
    <span
      className={`font-serif text-xl tracking-tight ${colour} ${className}`}
      aria-label={APP_NAME}
    >
      {APP_NAME}
    </span>
  );
}
