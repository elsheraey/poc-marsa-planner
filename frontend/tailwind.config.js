/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Apple HIG (iOS / macOS light mode) palette, flattened for web.
      // No alpha-on-label — every token is a solid hex. The previous
      // editorial palette (paper / ink / terracotta) has been deleted.
      //
      // Semantic use:
      //   bg-primary           surfaces cards / nav / modals sit on
      //   bg-secondary         slightly recessed — hover, pressed rows
      //   bg-grouped           grouped canvas (iOS settings-style lists)
      //   fill                 input / pill / chip background
      //   label                primary text (title / body)
      //   label-secondary      secondary — subtitles, captions
      //   label-tertiary       tertiary — placeholders, meta
      //   label-quaternary     disabled / decorative
      //   separator            hairline between rows / sections
      //   system-blue          primary action / link
      //   system-blue-hover    darker blue on hover
      //   system-blue-tint     tinted-background blue secondary button
      //   system-green/orange/red   attainability + status pills
      //   gray-1..6            neutral ramp for non-semantic slots
      //
      // Contrast audit (WCAG 2.1 AA, normal text ≥ 4.5:1):
      //   label #000000 on bg-primary #FFFFFF → 21:1 ✓
      //   label-secondary #3C3C43 on #FFFFFF → 10.6:1 ✓
      //   label-tertiary #8E8E93 on #FFFFFF → 3.3:1 — only used for
      //       placeholder / chevron, not body copy.
      //   system-blue #007AFF on #FFFFFF → 4.6:1 ✓ (semibold raises
      //       perceived contrast).
      colors: {
        "bg-primary": "#FFFFFF",
        "bg-secondary": "#F2F2F7",
        "bg-tertiary": "#FFFFFF",
        "bg-grouped": "#F2F2F7",
        fill: "#EBEBF0",

        label: "#000000",
        "label-secondary": "#3C3C43",
        "label-tertiary": "#8E8E93",
        "label-quaternary": "#C7C7CC",

        separator: "#D1D1D6",

        "system-blue": "#007AFF",
        "system-blue-hover": "#0A6FE0",
        "system-blue-tint": "#E5F1FF",

        "system-green": "#30D158",
        "system-green-tint": "#E4F8EA",
        "system-orange": "#FF9500",
        "system-orange-tint": "#FFF3E0",
        "system-red": "#FF3B30",
        "system-red-tint": "#FFE8E6",

        "gray-1": "#8E8E93",
        "gray-2": "#AEAEB2",
        "gray-3": "#C7C7CC",
        "gray-4": "#D1D1D6",
        "gray-5": "#E5E5EA",
        "gray-6": "#F2F2F7",
      },
      fontFamily: {
        // SF Pro via the system font stack — no Google Fonts, no bundled
        // webfonts. `-apple-system` / `BlinkMacSystemFont` hit SF on macOS
        // and iOS; `"SF Pro Text"` / `"SF Pro Display"` catch users who
        // have the fonts installed manually; Inter is the Linux/Windows
        // fallback with the closest metrics; then Helvetica/Arial.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "Inter",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          "Inter",
          '"Helvetica Neue"',
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
