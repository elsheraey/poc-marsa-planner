import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { getLocale, setLocale, t } from "../i18n";

type Props = { title: ReactNode; trailing?: ReactNode };

export default function TopBar({ title, trailing }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const nav = useNavigate();

  const displayName = user?.name ?? "Advisor";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    await dispatch(logout());
    nav("/login");
  }

  function toggleLocale() {
    const next = getLocale() === "ar" ? "en" : "ar";
    setLocale(next);
    // A full reload is acceptable for v1 — it re-runs applyHtmlDir() in
    // main.tsx and re-evaluates every t() call through the new dictionary.
    window.location.reload();
  }

  return (
    <header className="h-16 bg-white flex items-center justify-between px-8 border-b border-border/70">
      <div className="text-lg font-bold">{title}</div>
      <div className="flex items-center gap-4">
        {trailing}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLocale}
            className="text-sm font-semibold text-primary-500 hover:text-primary-600 h-9 px-3 rounded-lg border border-border"
            aria-label="Toggle language"
            data-testid="locale-toggle"
          >
            {t("locale.toggle")}
          </button>
          <span className="text-sm font-medium">{displayName}</span>
          <div className="w-9 h-9 rounded-full bg-primary-500 text-white font-semibold text-sm flex items-center justify-center">
            {initials || "?"}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-muted hover:text-primary-500"
          >
            {t("nav.signout")}
          </button>
        </div>
      </div>
    </header>
  );
}
