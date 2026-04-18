import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { clearError, login } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { hasKey, t } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login page — Azimut card-on-canvas pattern.
 *
 * Full-height `bg-az-canvas` canvas, centred `max-w-sm` rounded white
 * card with a 1px az-separator ring and a soft shadow. Inside the card:
 * centred Marsa wordmark, heading, muted subtitle, grouped-inset inputs,
 * full-width black primary button, black-text / gold-hover link to the
 * sign-up counterpart.
 *
 * Accessibility:
 *   - Each input is wired to its label via htmlFor/id.
 *   - Field errors get `text-rose-600 text-xs` and render in-flow so
 *     AT announces them right after the field.
 *   - Server errors surface via `role="alert"`.
 *   - Focus rings are the az-gold 2px ring on every interactive el.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);
  const nav = useNavigate();

  // Clear any banner left over from a sibling auth page (e.g. a failed
  // Register → Sign in flow leaks an "email already registered" into Login,
  // and vice versa) — the banner is cross-cutting redux state, so we reset
  // it on mount instead of scoping it per page.
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!EMAIL_RE.test(email)) errs.email = t("auth.error.email_required");
    if (password.length < 1) errs.password = t("auth.error.password_required");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const res = await dispatch(login({ email, password }));
    if (login.fulfilled.match(res)) {
      toast(t("auth.login.toast.success"), "success");
      nav("/clients");
    }
  }

  return (
    <div className="min-h-screen bg-az-canvas text-az-ink flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <Link to="/" aria-label="Home">
              <Logo />
            </Link>
          </div>

          <div className="bg-az-white rounded-2xl ring-1 ring-az-separator shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-8">
            <h1 className="text-2xl font-bold tracking-tight text-center">
              {t("auth.login.heading")}
            </h1>
            <p className="mt-2 text-[15px] text-az-ink-muted text-center leading-relaxed">
              {t("auth.login.subheading")}
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold text-az-ink-muted mb-1.5"
                  htmlFor="login-email"
                >
                  {t("auth.login.email")}
                </label>
                <input
                  id="login-email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  required
                />
                {fieldErrors.email && (
                  <div className="text-xs text-rose-600 mt-1.5">{fieldErrors.email}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-az-ink-muted mb-1.5"
                  htmlFor="login-password"
                >
                  {t("auth.login.password")}
                </label>
                <input
                  id="login-password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.password}
                  required
                />
                {fieldErrors.password && (
                  <div className="text-xs text-rose-600 mt-1.5">{fieldErrors.password}</div>
                )}
              </div>

              {error && (
                <div
                  className="text-sm text-rose-800 bg-rose-100 rounded-lg px-3 py-2"
                  role="alert"
                >
                  {(() => {
                    // Prefer a localised string keyed on the backend error
                    // code (e.g. `unauthorized` → `auth.error.server.unauthorized`).
                    // Fall back to the raw upstream English message only when
                    // we have no translation — better than leaking backend
                    // prose into an Arabic page.
                    const key = error.code
                      ? `auth.error.server.${error.code}`
                      : null;
                    if (key && hasKey(key)) return t(key);
                    return error.message || t("auth.error.server.default");
                  })()}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? t("auth.login.submitting") : t("auth.login.submit")}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[15px] text-az-ink-muted">
            {t("auth.login.need_account")}{" "}
            <Link
              className="text-az-black hover:text-az-gold-hover font-semibold underline underline-offset-4 decoration-az-separator hover:decoration-az-gold"
              to="/register"
              data-testid="registerLink"
            >
              {t("auth.login.sign_up")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
