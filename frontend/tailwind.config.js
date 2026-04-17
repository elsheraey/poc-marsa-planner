/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EEF0FF",
          100: "#DDE0FF",
          200: "#BBC1FF",
          300: "#8A8EFF",
          400: "#6F6AEF",
          500: "#5841D8",
          600: "#4A34BE",
          700: "#3C2A9E",
          800: "#2F217A",
          900: "#221857",
        },
        accent: {
          pink: "#E94FA5",
          cyan: "#57D3E0",
        },
        surface: "#F5F6FA",
        border: "#E5E7EB",
        ink: "#1A1A2E",
        muted: "#6B7280",
      },
      boxShadow: {
        card: "0 4px 16px -4px rgba(24, 24, 40, 0.08)",
        cardHover: "0 8px 24px -4px rgba(24, 24, 40, 0.12)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "sidebar-gradient":
          "linear-gradient(180deg, #4C3DBE 0%, #6B5CEF 100%)",
        "hero-gradient":
          "linear-gradient(135deg, #1B1478 0%, #3824B0 50%, #5841D8 100%)",
        "report-gradient":
          "linear-gradient(135deg, #5841D8 0%, #6B5CEF 60%, #8778F5 100%)",
      },
    },
  },
  plugins: [],
};
