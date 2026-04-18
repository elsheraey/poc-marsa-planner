import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { login } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { t } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Editorial Login page.
 *
 * Single cream column, `max-w-md` wide, centred. No split-panel hero, no
 * gradient, no decorative SVG. Bottom-rule inputs with plain <label>
 * elements above, an editorial outline button at the bottom, and a
 * small "create an account" link underneath.
 *
 * ACCESSIBILITY:
 *   - Each <input> is wired to its <label> via htmlFor/id.
 *   - Inline field errors get `text-accent text-xs` and sit in the flow
 *     so AT users hear them right after the field.
 *   - The server error surfaces via `role="alert"` so it's announced.
 *   - The ink outline button has a visible `:focus-visible` ring from the
 *     browser default plus `focus:outline-accent` to keep keyboard nav
 *     unambiguous against the cream.
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
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-md mx-auto px-8 py-24">
        <div className="mb-16">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
        </div>

        <h1 className="font-serif text-4xl tracking-tight mb-2">
          {t("auth.login.heading")}
        </h1>
        <p className="font-serif italic text-ink-muted mb-10 leading-relaxed">
          {t("auth.login.subheading")}
        </p>

        <form onSubmit={onSubmit} noValidate className="space-y-8">
          <div>
            <label
              className="label block mb-2"
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
              <div className="text-xs text-accent mt-2">{fieldErrors.email}</div>
            )}
          </div>

          <div>
            <label
              className="label block mb-2"
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
              <div className="text-xs text-accent mt-2">{fieldErrors.password}</div>
            )}
          </div>

          {error && (
            <div
              className="text-sm text-accent border-t border-accent pt-3"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn w-full"
            disabled={status === "loading"}
          >
            {status === "loading" ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
        </form>

        <p className="mt-8 text-sm text-ink-muted">
          {t("auth.login.need_account")}{" "}
          <Link
            className="text-ink underline decoration-accent underline-offset-4"
            to="/register"
            data-testid="registerLink"
          >
            {t("auth.login.sign_up")}
          </Link>
        </p>
      </div>
    </div>
  );
}
