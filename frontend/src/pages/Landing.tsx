import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { getLocale, setLocale, t } from "../i18n";

function toggleLocale() {
  const next = getLocale() === "ar" ? "en" : "ar";
  setLocale(next);
  globalThis.window.location.reload();
}

/**
 * Editorial landing page.
 *
 * A single cream column — serif headline, two-sentence lede, one
 * inline-link CTA, three below-the-fold paragraphs separated by
 * hairline rules. No hero gradient, no dual CTAs, no dot grid. Reads as
 * "a considered document" rather than a SaaS marketing splash.
 */
export default function Landing() {
  const nav = useNavigate();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <Logo />
          <Link
            to="/login"
            className="text-sm text-ink hover:underline underline-offset-4"
          >
            {t("landing.cta")}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="max-w-prose mx-auto px-8 py-24">
          <h1 className="font-serif tracking-tight text-ink text-5xl md:text-6xl mb-8">
            {t("landing.title")}
          </h1>
          <p className="text-lg text-ink mb-4 leading-relaxed">
            {t("landing.subtitle")}
          </p>
          <p className="text-base text-ink-muted mb-8 leading-relaxed">
            {t("landing.body")}
          </p>
          <p className="text-base">
            <button
              type="button"
              onClick={() => nav("/login")}
              className="text-ink underline decoration-accent underline-offset-4 hover:decoration-2"
            >
              {t("landing.cta")} →
            </button>
          </p>

          <section className="border-t border-rule pt-8 mt-16">
            <h2 className="font-serif text-2xl mb-3">
              {t("landing.section.credible.title")}
            </h2>
            <p className="text-ink-muted leading-relaxed">
              {t("landing.section.credible.body")}
            </p>
          </section>

          <section className="border-t border-rule pt-8 mt-12">
            <h2 className="font-serif text-2xl mb-3">
              {t("landing.section.inflation.title")}
            </h2>
            <p className="text-ink-muted leading-relaxed">
              {t("landing.section.inflation.body")}
            </p>
          </section>

          <section className="border-t border-rule pt-8 mt-12">
            <h2 className="font-serif text-2xl mb-3">
              {t("landing.section.arabic.title")}
            </h2>
            <p className="text-ink-muted leading-relaxed">
              {t("landing.section.arabic.body")}
            </p>
          </section>

          <p className="mt-16">
            <Link
              to="/register"
              data-testid="registerLink"
              className="text-ink underline decoration-accent underline-offset-4 hover:decoration-2"
            >
              {t("auth.register")} →
            </Link>
          </p>
        </article>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between text-xs uppercase tracking-widest text-ink-muted">
          <span>{t("landing.footer", { year })}</span>
          <button
            type="button"
            onClick={toggleLocale}
            className="hover:text-ink"
            data-testid="locale-toggle"
            aria-label="Toggle language"
          >
            {t("locale.toggle")}
          </button>
        </div>
      </footer>
    </div>
  );
}
