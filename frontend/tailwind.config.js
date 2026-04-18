/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Marsa palette — deep navy + ochre on warm off-white. Contrast
      // targets: ink (#111827) on surface (#FAFAF6) and primary-900
      // (#0C2340) on surface both clear 4.5:1. Pink/cyan accents removed
      // entirely; attainability badges continue to use Tailwind's
      // default emerald-*, amber-*, rose-* which still read cleanly on
      // the new warm off-white.
      colors: {
        primary: {
          100: "#E4ECF4", // light tint for backgrounds
          500: "#1F4E85", // interactive (links, CTAs)
          700: "#14365A", // navy variant
          900: "#0C2340", // deep navy — main brand
          // Intermediate aliases kept for components that referenced
          // 50 / 400 / 600 / 800 before the palette swap. They resolve
          // to the nearest navy shade so no component needs to be
          // rewritten twice.
          50: "#F2F5FA",
          400: "#2C5E9A",
          600: "#163E6A",
          800: "#0E2A4C",
        },
        accent: {
          DEFAULT: "#D4A24C", // ochre/gold — badges, highlights
          soft: "#EAD6A8", // light ochre for surfaces
        },
        surface: "#FAFAF6", // warm off-white
        border: "#E6E3DC", // warm neutral border
        ink: "#111827", // body text
        muted: "#6B7280", // secondary text
      },
      boxShadow: {
        card: "0 4px 16px -4px rgba(12, 35, 64, 0.10)",
        cardHover: "0 8px 24px -4px rgba(12, 35, 64, 0.14)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        // Navy-on-navy sidebar. No purple tint.
        "sidebar-gradient":
          "linear-gradient(180deg, #0C2340 0%, #14365A 100%)",
        // Hero: deep navy to a slightly lighter navy. No purple-to-pink.
        "hero-gradient":
          "linear-gradient(135deg, #0C2340 0%, #14365A 60%, #1F4E85 100%)",
        // Report header: navy -> deeper navy with a hint of ochre overlay
        // on the far right. Rendered as two stacked gradients so the
        // ochre stays subtle (10% at the warm end, fading to zero).
        "report-gradient":
          "linear-gradient(110deg, rgba(212,162,76,0) 55%, rgba(212,162,76,0.18) 100%), linear-gradient(135deg, #0C2340 0%, #0E2A4C 50%, #14365A 100%)",
      },
    },
  },
  plugins: [],
};
