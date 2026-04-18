import { describe, it, expect, beforeEach } from "vitest";
import { applyHtmlDir, getLocale, setLocale, t } from "./index";

describe("i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLocale("en");
  });

  it("defaults to English", () => {
    expect(getLocale()).toBe("en");
    expect(t("nav.clients")).toBe("Clients");
  });

  it("switches to Arabic translations after setLocale", () => {
    setLocale("ar");
    expect(getLocale()).toBe("ar");
    expect(t("nav.clients")).toBe("العملاء");
    expect(t("wizard.profile")).toBe("البيانات الشخصية");
  });

  it("falls back to English when an Arabic key is missing", () => {
    setLocale("ar");
    // Intentionally request a key that we only add to English.
    expect(t("auth.login")).not.toBe("auth.login");
  });

  it("returns the key itself when both dictionaries miss", () => {
    expect(t("totally.missing.key")).toBe("totally.missing.key");
  });

  it("interpolates {name} vars", () => {
    expect(t("report.disclosure.data", { calibration: "2026-04", now: "x" }))
      .toMatch(/2026-04/);
  });

  it("applyHtmlDir flips dir and lang on the <html> element", () => {
    setLocale("en");
    applyHtmlDir();
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    expect(document.documentElement.getAttribute("lang")).toBe("en");

    setLocale("ar");
    applyHtmlDir();
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
  });

  it("persists the locale to localStorage", () => {
    setLocale("ar");
    expect(window.localStorage.getItem("marsa.locale")).toBe("ar");
  });
});
