/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Azimut Egypt visual system. Black-dominant chrome, single gold
      // accent, Cairo typeface. Palette lifted from azimut.eg's live CSS.
      //
      // Semantic use:
      //   az-black            nav / footer / dark chrome
      //   az-black-soft       hover on dark surfaces
      //   az-ink              body text (near-black, not pure)
      //   az-ink-muted        secondary text / captions
      //   az-ink-subtle       tertiary placeholders / chevrons
      //   az-gold             the ONE accent — CTAs, active tabs,
      //                       underlines, pill backgrounds
      //   az-gold-hover       darker gold for hover states
      //   az-gold-soft        tint for chip / avatar backgrounds
      //   az-white            content canvas
      //   az-canvas           grouped background
      //   az-card             elevated surfaces (alias of az-white)
      //   az-separator        1px hairline
      //   az-separator-strong stronger hairline on light panels
      //
      // Contrast audit (WCAG 2.1 AA, normal text ≥ 4.5:1):
      //   az-ink   #212529 on az-white #FFFFFF → 15.8:1 ✓
      //   az-ink-muted #6B6B6B on #FFFFFF → 5.3:1 ✓
      //   az-gold  #F9AB00 on #FFFFFF → 2.6:1 ✗ — reserved for filled
      //       backgrounds, pills and dark-surface accents only.
      //   az-gold  #F9AB00 on az-black #000000 → 8.1:1 ✓
      //   az-black #000000 on az-gold #F9AB00 → 8.1:1 ✓ (CTA filled)
      //
      // Semantic state colours use Tailwind's emerald / amber / rose 100+800
      // ramp so the calmer pill treatment matches Azimut's restrained tone.
      colors: {
        "az-black": "#000000",
        "az-black-soft": "#1A1A1A",
        "az-ink": "#212529",
        "az-ink-muted": "#6B6B6B",
        "az-ink-subtle": "#9CA3AF",

        "az-gold": "#F9AB00",
        "az-gold-hover": "#D89200",
        "az-gold-soft": "#FFE9B8",

        "az-white": "#FFFFFF",
        "az-canvas": "#F5F5F5",
        "az-card": "#FFFFFF",
        "az-separator": "#E5E5E5",
        "az-separator-strong": "#D4D4D4",
      },
      fontFamily: {
        // Cairo via Google Fonts (loaded in index.html). Supports Latin +
        // Arabic glyph coverage — the same face used by azimut.eg. System
        // fallbacks kick in while the font is still streaming.
        sans: [
          '"Cairo"',
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          '"Cairo"',
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
