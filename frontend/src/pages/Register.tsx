import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { toast } from "../components/Toaster";
import { register } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (name.trim().length < 1) e.name = "Name is required";
    if (!EMAIL_RE.test(email)) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const res = await dispatch(register({ name: name.trim(), email, password }));
    if (register.fulfilled.match(res)) {
      toast("Account created", "success");
      nav("/clients");
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="relative bg-hero-gradient text-white flex flex-col justify-between p-10 overflow-hidden">
        <Logo variant="light" className="self-start" />
        <div className="relative text-center max-w-sm mx-auto mt-20">
          <h2 className="text-2xl font-bold mb-3">Create your Marsa account</h2>
          <p className="text-white/80">Start managing client portfolios in minutes.</p>
        </div>
        <div />
      </div>

      <div className="flex items-center justify-center p-10">
        <form className="w-full max-w-md" onSubmit={onSubmit} noValidate>
          <h1 className="text-3xl font-extrabold mb-8">Create account</h1>

          <label className="label block mb-2" htmlFor="reg-name">
            Full name
          </label>
          <input
            id="reg-name"
            className="input mb-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            aria-invalid={!!errs.name}
            required
          />
          <div className="h-5 text-xs text-red-600">{errs.name}</div>

          <label className="label block mb-2" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            className="input mb-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!errs.email}
            required
          />
          <div className="h-5 text-xs text-red-600">{errs.email}</div>

          <label className="label block mb-2" htmlFor="reg-password">
            Password
          </label>
          <input
            id="reg-password"
            className="input mb-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!errs.password}
            required
          />
          <div className="h-5 text-xs text-red-600">{errs.password}</div>

          <label className="label block mb-2" htmlFor="reg-confirm">
            Confirm password
          </label>
          <input
            id="reg-confirm"
            className="input mb-1"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!errs.confirm}
            required
          />
          <div className="h-5 text-xs text-red-600">{errs.confirm}</div>

          {apiError && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2" role="alert">
              {apiError}
            </div>
          )}

          <button className="btn-primary w-full h-12 mt-6" disabled={status === "loading"}>
            {status === "loading" ? "Creating account..." : "Create account"}
          </button>
          <div className="text-center text-xs text-muted mt-4">
            Already have an account?{" "}
            <Link className="text-primary-500 font-semibold" to="/login">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
