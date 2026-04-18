/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Editorial palette. Not a fintech dashboard, not a brand mood-board —
      // a private banker's quarterly letter. Cream paper, ink type, one
      // terracotta accent, warm rules between sections. All previous navy
      // + ochre + primary-* tokens are gone; the attainability states
      // continue to use Tailwind's built-in emerald/amber/rose at muted
      // (100/900) weights.
      //
      // Contrast audit (WCAG 2.1 AA, normal text ≥ 4.5:1):
      //   ink   #1A1816 on paper #FBF8F1 → 15.4:1 ✓
      //   ink-muted #6B655C on paper #FBF8F1 → 4.77:1 ✓
      //   accent #7A3B2E on paper #FBF8F1 → 6.58:1 ✓
      colors: {
        paper: "#FBF8F1", // warm cream, primary surface
        "paper-deep": "#F4EFE4", // slightly deeper cream for contrast panels
        ink: "#1A1816", // near-black warm
        "ink-muted": "#6B655C", // warm gray, secondary text
        accent: {
          DEFAULT: "#7A3B2E", // deep terracotta — the only accent colour
          soft: "#D9B8A9", // pale terracotta for subtle backgrounds/badges
        },
        rule: "#E8E2D4", // warm hairline for every divider
      },
      fontFamily: {
        // Body copy keeps the existing system sans stack. Serif uses the
        // system serif — no Google Fonts, no new dependency. Registered
        // here so `font-serif` works everywhere h1–h3 can't be reached
        // (e.g. inline display text inside a button).
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: ["ui-serif", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
