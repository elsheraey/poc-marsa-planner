import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { register } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { t } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Editorial Register page. Mirror of the Login layout: cream paper, a
 * serif heading, italic serif subheading, bottom-rule inputs, editorial
 * outline button, single small link to Sign in. No split-panel hero.
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
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-md mx-auto px-8 py-24">
        <div className="mb-16">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
        </div>

        <h1 className="font-serif text-4xl tracking-tight mb-2">
          {t("auth.register.heading")}
        </h1>
        <p className="font-serif italic text-ink-muted mb-10 leading-relaxed">
          {t("auth.register.subheading")}
        </p>

        <form onSubmit={onSubmit} noValidate className="space-y-8">
          <div>
            <label className="label block mb-2" htmlFor="reg-name">
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
            {errs.name && <div className="text-xs text-accent mt-2">{errs.name}</div>}
          </div>

          <div>
            <label className="label block mb-2" htmlFor="reg-email">
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
            {errs.email && <div className="text-xs text-accent mt-2">{errs.email}</div>}
          </div>

          <div>
            <label className="label block mb-2" htmlFor="reg-password">
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
              <div className="text-xs text-accent mt-2">{errs.password}</div>
            )}
          </div>

          <div>
            <label className="label block mb-2" htmlFor="reg-confirm">
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
              <div className="text-xs text-accent mt-2">{errs.confirm}</div>
            )}
          </div>

          {apiError && (
            <div
              className="text-sm text-accent border-t border-accent pt-3"
              role="alert"
            >
              {apiError}
            </div>
          )}

          <button
            type="submit"
            className="btn w-full"
            disabled={status === "loading"}
          >
            {status === "loading"
              ? t("auth.register.submitting")
              : t("auth.register.submit")}
          </button>
        </form>

        <p className="mt-8 text-sm text-ink-muted">
          {t("auth.register.have_account")}{" "}
          <Link
            className="text-ink underline decoration-accent underline-offset-4"
            to="/login"
          >
            {t("auth.register.sign_in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
