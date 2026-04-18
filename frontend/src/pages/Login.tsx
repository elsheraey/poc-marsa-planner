import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { login } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { t } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="relative bg-hero-gradient text-white flex flex-col justify-between p-10 overflow-hidden">
        <Logo variant="light" className="self-start" />
        <div className="relative text-center max-w-sm mx-auto">
          <h2 className="text-2xl font-bold mb-3">{t("auth.login.welcome")}</h2>
          <p className="text-white/80">{t("auth.login.subheading")}</p>
        </div>
        <div />
      </div>

      <div className="flex items-center justify-center p-10">
        <form className="w-full max-w-md" onSubmit={onSubmit} noValidate>
          <h1 className="text-3xl font-extrabold mb-8">{t("auth.login.heading")}</h1>

          <label className="label block mb-2" htmlFor="login-email">
            {t("auth.login.email")}
          </label>
          <input
            id="login-email"
            className="input mb-1"
            placeholder={t("auth.login.email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            required
          />
          {fieldErrors.email && (
            <div className="text-xs text-red-600 mb-3">{fieldErrors.email}</div>
          )}
          {!fieldErrors.email && <div className="mb-4" />}

          <label className="label block mb-2" htmlFor="login-password">
            {t("auth.login.password")}
          </label>
          <input
            id="login-password"
            className="input"
            placeholder={t("auth.login.password_placeholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            aria-invalid={!!fieldErrors.password}
            required
          />
          {fieldErrors.password && (
            <div className="text-xs text-red-600 mt-1">{fieldErrors.password}</div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-4" role="alert">
              {error}
            </div>
          )}

          <button className="btn-primary w-full h-12 mt-6" disabled={status === "loading"}>
            {status === "loading" ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
          <div className="text-center text-xs text-muted mt-4">
            {t("auth.login.need_account")}{" "}
            <Link className="text-primary-500 font-semibold" to="/register">
              {t("auth.login.sign_up")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
