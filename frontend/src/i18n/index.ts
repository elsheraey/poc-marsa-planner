// Tiny dictionary-based i18n. Deliberately avoids react-i18next to keep
// bundle small and to make it trivial for QA to grep translations. The
// current locale lives in localStorage under `marsa.locale`. Toggling
// the locale requires a page reload (acceptable for v1) — the caller is
// expected to `window.location.reload()` after `setLocale(...)`.

import en from "./en";
import ar from "./ar";

export type Locale = "en" | "ar";

const STORAGE_KEY = "marsa.locale";
const DICTIONARIES: Record<Locale, Record<string, string>> = { en, ar };

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "ar" ? "ar" : "en";
}

let currentLocale: Locale = readStoredLocale();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(next: Locale) {
  currentLocale = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next);
  }
}

// Applies `<html dir="rtl|ltr" lang="...">` based on the current locale.
// Safe to call on every mount; idempotent.
export function applyHtmlDir() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", currentLocale);
  document.documentElement.setAttribute(
    "dir",
    currentLocale === "ar" ? "rtl" : "ltr"
  );
}

/**
 * Resolve a translation key. If the key is missing in the active dictionary
 * we fall back to English, then to the key itself — this way callers can
 * safely render `t("missing.key")` and a human-readable string always comes
 * out. Optional `vars` do simple `{name}` interpolation.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = DICTIONARIES[currentLocale] ?? en;
  let out = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }
  return out;
}
