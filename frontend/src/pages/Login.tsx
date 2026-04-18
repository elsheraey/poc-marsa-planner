import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { login } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { t } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login page — Apple card-on-grouped-canvas pattern.
 *
 * Full-height bg-grouped canvas, centred `max-w-sm` rounded card with a
 * 1px separator ring and a soft shadow. Inside the card: centred Marsa
 * wordmark, Large-Title-ish heading, muted subtitle, grouped-inset
 * inputs, full-width system-blue primary button, blue text link to the
 * sign-up counterpart.
 *
 * Accessibility:
 *   - Each input is wired to its label via htmlFor/id.
 *   - Field errors get `text-system-red text-xs` and render in-flow so
 *     AT announces them right after the field.
 *   - Server errors surface via `role="alert"`.
 *   - Focus rings are the system-blue 2px ring on every interactive el.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);
  const nav = useNavigate();

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
    <div className="min-h-screen bg-bg-grouped text-label flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <Link to="/" aria-label="Home">
              <Logo />
            </Link>
          </div>

          <div className="bg-bg-primary rounded-2xl ring-1 ring-separator shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-8">
            <h1 className="text-2xl font-bold tracking-tight text-center">
              {t("auth.login.heading")}
            </h1>
            <p className="mt-2 text-[15px] text-label-secondary text-center leading-relaxed">
              {t("auth.login.subheading")}
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold text-label-secondary mb-1.5"
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
                  <div className="text-xs text-system-red mt-1.5">{fieldErrors.email}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-label-secondary mb-1.5"
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
                  <div className="text-xs text-system-red mt-1.5">{fieldErrors.password}</div>
                )}
              </div>

              {error && (
                <div
                  className="text-sm text-system-red bg-system-red-tint rounded-lg px-3 py-2"
                  role="alert"
                >
                  {error}
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

          <p className="mt-6 text-center text-[15px] text-label-secondary">
            {t("auth.login.need_account")}{" "}
            <Link
              className="text-system-blue hover:text-system-blue-hover font-semibold"
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
