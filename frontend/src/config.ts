// Single-source-of-truth for the product name. Every user-visible string
// that previously hardcoded the brand now reads from this constant — swap
// the two values below to rebrand without touching i18n dictionaries or
// page components. Keep the keys stable; rename the values only.
export const APP_NAME = "Marsa";

// Arabic form of the product name. Used by `ar.ts` via {appName}
// interpolation so the RTL copy also picks up a brand swap automatically.
export const APP_NAME_AR = "مرسى";
