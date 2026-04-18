import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { getLocale, setLocale, t } from "../i18n";

function toggleLocale() {
  const next = getLocale() === "ar" ? "en" : "ar";
  setLocale(next);
  globalThis.window.location.reload();
}

/**
 * Landing page — Apple marketing-page pattern.
 *
 *   - Translucent nav at the top (wordmark + "Open the portal" link)
 *   - Centred hero with a Large Title headline, muted subtitle, system-
 *     blue primary CTA.
 *   - Three feature cards below on rounded bg-secondary tiles.
 *
 * No gradient, no dot-grid, no paper-cream surfaces. Sits on a subtle
 * `bg-primary → bg-secondary` vertical gradient for depth.
 */
export default function Landing() {
  const nav = useNavigate();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-primary to-bg-secondary text-label flex flex-col">
      <header className="app-nav">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6 text-[15px] font-semibold">
            <Link
              to="/login"
              className="text-system-blue hover:text-system-blue-hover transition"
            >
              {t("landing.cta")}
            </Link>
            <button
              type="button"
              onClick={toggleLocale}
              className="text-system-blue hover:text-system-blue-hover transition"
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
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-label leading-[1.05]">
            {t("landing.title")}
          </h1>
          <p className="mt-6 text-xl text-label-secondary max-w-2xl mx-auto leading-relaxed">
            {t("landing.subtitle")}
          </p>
          <p className="mt-4 text-base text-label-tertiary max-w-2xl mx-auto leading-relaxed">
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
          <article className="rounded-2xl bg-bg-secondary p-6">
            <h2 className="text-xl font-semibold tracking-tight text-label">
              {t("landing.section.credible.title")}
            </h2>
            <p className="mt-2 text-[15px] text-label-secondary leading-relaxed">
              {t("landing.section.credible.body")}
            </p>
          </article>
          <article className="rounded-2xl bg-bg-secondary p-6">
            <h2 className="text-xl font-semibold tracking-tight text-label">
              {t("landing.section.inflation.title")}
            </h2>
            <p className="mt-2 text-[15px] text-label-secondary leading-relaxed">
              {t("landing.section.inflation.body")}
            </p>
          </article>
          <article className="rounded-2xl bg-bg-secondary p-6">
            <h2 className="text-xl font-semibold tracking-tight text-label">
              {t("landing.section.arabic.title")}
            </h2>
            <p className="mt-2 text-[15px] text-label-secondary leading-relaxed">
              {t("landing.section.arabic.body")}
            </p>
          </article>
        </section>
      </main>

      <footer className="border-t border-separator bg-bg-primary/60">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-label-tertiary">
          {t("landing.footer", { year })}
        </div>
      </footer>
    </div>
  );
}
