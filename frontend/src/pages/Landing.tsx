import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { t } from "../i18n";

// Advisor-voiced landing page. The previous copy targeted end-investors
// ("Start your investment plan now / be one step ahead") while the CTA
// targeted advisors — a recognisability-killer in the first second of
// the demo. This page now names the advisor's problem and claims the
// thirty-second answer as the product promise.
export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-hero-gradient text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo variant="light" />
        <button
          type="button"
          className="h-10 px-5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
          onClick={() => nav("/login")}
        >
          {t("landing.cta")}
        </button>
      </header>

      <main className="flex-1 flex items-center px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            {t("landing.title")}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-6 leading-snug">
            {t("landing.subtitle")}
          </p>
          <p className="text-white/75 max-w-2xl mb-10 leading-relaxed">
            {t("landing.body")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="h-12 px-8 rounded-lg bg-white text-primary-600 text-sm font-semibold hover:bg-white/90"
              onClick={() => nav("/login")}
            >
              {t("landing.cta")}
            </button>
            <button
              type="button"
              className="h-12 px-8 rounded-lg border border-white/60 text-white text-sm font-semibold hover:bg-white/10"
              onClick={() => nav("/register")}
            >
              {t("auth.register")}
            </button>
          </div>
        </div>
      </main>

      <footer className="px-8 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Marsa
      </footer>
    </div>
  );
}
