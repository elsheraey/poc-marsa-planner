import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { register } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { t } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register page — mirror of Login.
 *
 * Same Apple card-on-grouped-canvas layout: centred wordmark, rounded
 * `max-w-sm` card with ring + soft shadow, grouped-inset inputs, a
 * full-width system-blue primary CTA, and a blue text link to Sign in.
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
              {t("auth.register.heading")}
            </h1>
            <p className="mt-2 text-[15px] text-label-secondary text-center leading-relaxed">
              {t("auth.register.subheading")}
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold text-label-secondary mb-1.5"
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
                  <div className="text-xs text-system-red mt-1.5">{errs.name}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-label-secondary mb-1.5"
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
                  <div className="text-xs text-system-red mt-1.5">{errs.email}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-label-secondary mb-1.5"
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
                  <div className="text-xs text-system-red mt-1.5">{errs.password}</div>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-label-secondary mb-1.5"
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
                  <div className="text-xs text-system-red mt-1.5">{errs.confirm}</div>
                )}
              </div>

              {apiError && (
                <div
                  className="text-sm text-system-red bg-system-red-tint rounded-lg px-3 py-2"
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

          <p className="mt-6 text-center text-[15px] text-label-secondary">
            {t("auth.register.have_account")}{" "}
            <Link
              className="text-system-blue hover:text-system-blue-hover font-semibold"
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
