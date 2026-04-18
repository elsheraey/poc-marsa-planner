import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { clearError, register } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { t } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register page — mirror of Login.
 *
 * Same Azimut card-on-canvas layout: centred wordmark, rounded max-w-sm
 * white card with ring + soft shadow, grouped-inset inputs, a
 * full-width black primary CTA, and a black-text / gold-hover link to
 * Sign in.
 */
export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const apiError = useAppSelector((s) => s.auth.error);
  const nav = useNavigate();

  // Clear any banner left over from a sibling auth page. See matching
  // comment in Login.tsx — without this, a failed Login → "Sign up" leaks
  // the "invalid credentials" banner into a freshly-mounted Register form.
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (name.trim().length < 1) e.name = t("auth.error.name_required");
    if (!EMAIL_RE.test(email)) e.email = t("auth.error.email_invalid");
    if (password.length < 8) e.password = t("auth.error.password_min");
    if (password !== confirm) e.confirm = t("auth.error.password_mismatch");
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const res = await dispatch(register({ name: name.trim(), email, password }));
    if (register.fulfilled.match(res)) {
      toast(t("auth.register.toast.success"), "success");
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
              {t("auth.register.heading")}
            </h1>
            <p className="mt-2 text-[15px] text-az-ink-muted text-center leading-relaxed">
              {t("auth.register.subheading")}
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold text-az-ink-muted mb-1.5"
                  htmlFor="reg-name"
                >
                  {t("auth.register.name")}
                </label>
                <input
                  id="reg-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  aria-invalid={!!errs.name}
                  required
                />
                {errs.name && (
                  <div className="text-xs text-rose-600 mt-1.5">{errs.name}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-az-ink-muted mb-1.5"
                  htmlFor="reg-email"
                >
                  {t("auth.register.email")}
                </label>
                <input
                  id="reg-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-invalid={!!errs.email}
                  required
                />
                {errs.email && (
                  <div className="text-xs text-rose-600 mt-1.5">{errs.email}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-az-ink-muted mb-1.5"
                  htmlFor="reg-password"
                >
                  {t("auth.register.password")}
                </label>
                <input
                  id="reg-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!errs.password}
                  required
                />
                {errs.password && (
                  <div className="text-xs text-rose-600 mt-1.5">{errs.password}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-az-ink-muted mb-1.5"
                  htmlFor="reg-confirm"
                >
                  {t("auth.register.confirm_password")}
                </label>
                <input
                  id="reg-confirm"
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!errs.confirm}
                  required
                />
                {errs.confirm && (
                  <div className="text-xs text-rose-600 mt-1.5">{errs.confirm}</div>
                )}
              </div>

              {apiError && (
                <div
                  className="text-sm text-rose-800 bg-rose-100 rounded-lg px-3 py-2"
                  role="alert"
                >
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={status === "loading"}
              >
                {status === "loading"
                  ? t("auth.register.submitting")
                  : t("auth.register.submit")}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[15px] text-az-ink-muted">
            {t("auth.register.have_account")}{" "}
            <Link
              className="text-az-black hover:text-az-gold-hover font-semibold underline underline-offset-4 decoration-az-separator hover:decoration-az-gold"
              to="/login"
            >
              {t("auth.register.sign_in")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
