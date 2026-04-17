import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { login } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

export default function Login() {
  const [email, setEmail] = useState("advisor@marsa.com");
  const [password, setPassword] = useState("demo");
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);
  const nav = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await dispatch(login({ email, password }));
    if (login.fulfilled.match(res)) nav("/clients");
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
        <form className="w-full max-w-md" onSubmit={onSubmit}>
          <h1 className="text-3xl font-extrabold mb-8">Financial Advisor Login</h1>

          <label className="label block mb-2">Email</label>
          <input
            className="input mb-5"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label className="label block mb-2">Password</label>
          <input
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          <div className="text-xs text-muted mt-2 mb-6">
            Forgot password? <a className="text-primary-500 font-semibold">Click here</a>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <button className="btn-primary w-full h-12" disabled={status === "loading"}>
            {status === "loading" ? "Signing in..." : "Login"}
          </button>
          <div className="text-center text-xs text-muted mt-4">
            Don't have an account? <a className="text-primary-500 font-semibold">Sign up</a>
          </div>
        </form>
      </div>
    </div>
  );
}
