import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { login } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

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
    if (!EMAIL_RE.test(email)) errs.email = "Enter a valid email address";
    if (password.length < 1) errs.password = "Password is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const res = await dispatch(login({ email, password }));
    if (login.fulfilled.match(res)) {
      toast("Signed in", "success");
      nav("/clients");
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="relative bg-hero-gradient text-white flex flex-col justify-between p-10 overflow-hidden">
        <Logo variant="light" className="self-start" />
        <div className="absolute inset-0 opacity-70 pointer-events-none">
          <div className="absolute top-20 left-10 grid grid-cols-10 gap-2">
            {Array.from({ length: 60 }).map((_, i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-white"
                style={{ opacity: 0.08 + ((i * 7) % 40) / 100 }}
              />
            ))}
          </div>
        </div>
        <div className="relative text-center max-w-sm mx-auto">
          <div className="mb-8 flex justify-center">
            <div className="w-40 h-40 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
              <svg width="110" height="110" viewBox="0 0 120 120" fill="none">
                <rect x="20" y="50" width="80" height="55" rx="6" fill="#F7C18C" />
                <rect x="30" y="40" width="60" height="50" rx="6" fill="#E94FA5" />
                <circle cx="60" cy="55" r="22" fill="#5841D8" />
                <path d="M75 35 l6 -15 l4 3" stroke="#F7C18C" strokeWidth="3" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Welcome to Marsa Portal</h2>
          <p className="text-white/80">
            Login to get started with Marsa
            <br />
            Financial planning tool
          </p>
        </div>
        <div />
      </div>

      <div className="flex items-center justify-center p-10">
        <form className="w-full max-w-md" onSubmit={onSubmit} noValidate>
          <h1 className="text-3xl font-extrabold mb-8">Financial Advisor Login</h1>

          <label className="label block mb-2" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="input mb-1"
            placeholder="Email address"
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
            Password
          </label>
          <input
            id="login-password"
            className="input"
            placeholder="Password"
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
            {status === "loading" ? "Signing in..." : "Login"}
          </button>
          <div className="text-center text-xs text-muted mt-4">
            Don't have an account?{" "}
            <Link className="text-primary-500 font-semibold" to="/register">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
