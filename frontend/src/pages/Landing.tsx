import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { getLocale, setLocale, t } from "../i18n";

function toggleLocale() {
  const next = getLocale() === "ar" ? "en" : "ar";
  setLocale(next);
  globalThis.window.location.reload();
}

/**
 * Landing page — Azimut typography-first hero.
 *
 *   - Black top bar with the wordmark in white and gold-hover links.
 *   - Centred hero on a plain white canvas: giant Cairo headline,
 *     muted subtitle, a single black primary CTA.
 *   - Three restrained feature cards on the canvas-grey tile pattern.
 *
 * No gradient overlay, no hero illustration. Azimut leans into clean
 * type and negative space.
 */
export default function Landing() {
  const nav = useNavigate();
  const year = new Date().getFullYear();
  const navLinkBase =
    "text-az-white hover:text-az-gold hover:underline decoration-az-gold underline-offset-4 transition";

  return (
    <div className="min-h-screen bg-az-white text-az-ink flex flex-col">
      <header className="app-nav">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo variant="light" />
          <div className="flex items-center gap-6 text-[15px] font-semibold">
            <Link
              to="/login"
              className={navLinkBase}
            >
              {t("landing.cta")}
            </Link>
            <button
              type="button"
              onClick={toggleLocale}
              className={navLinkBase}
              data-testid="locale-toggle"
              aria-label="Toggle language"
            >
              {t("locale.toggle")}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-az-black leading-[1.05]">
            {t("landing.title")}
          </h1>
          <p className="mt-6 text-xl text-az-ink-muted max-w-2xl mx-auto leading-relaxed">
            {t("landing.subtitle")}
          </p>
          <p className="mt-4 text-base text-az-ink-subtle max-w-2xl mx-auto leading-relaxed">
            {t("landing.body")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => nav("/login")}
              className="btn-primary"
            >
              {t("landing.cta")}
            </button>
            <Link
              to="/register"
              data-testid="registerLink"
              className="btn-plain"
            >
              {t("auth.register")}
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-5">
          <article className="rounded-2xl bg-az-canvas p-6">
            <h2 className="text-xl font-semibold tracking-tight text-az-black">
              {t("landing.section.credible.title")}
            </h2>
            <p className="mt-2 text-[15px] text-az-ink-muted leading-relaxed">
              {t("landing.section.credible.body")}
            </p>
          </article>
          <article className="rounded-2xl bg-az-canvas p-6">
            <h2 className="text-xl font-semibold tracking-tight text-az-black">
              {t("landing.section.inflation.title")}
            </h2>
            <p className="mt-2 text-[15px] text-az-ink-muted leading-relaxed">
              {t("landing.section.inflation.body")}
            </p>
          </article>
          <article className="rounded-2xl bg-az-canvas p-6">
            <h2 className="text-xl font-semibold tracking-tight text-az-black">
              {t("landing.section.arabic.title")}
            </h2>
            <p className="mt-2 text-[15px] text-az-ink-muted leading-relaxed">
              {t("landing.section.arabic.body")}
            </p>
          </article>
        </section>
      </main>

      <footer className="border-t border-az-separator bg-az-white">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-az-ink-subtle">
          {t("landing.footer", { year })}
        </div>
      </footer>
    </div>
  );
}
