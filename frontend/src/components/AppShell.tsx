import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { logout } from "../store/slices/authSlice";
import { APP_NAME } from "../config";
import { getLocale, setLocale, t } from "../i18n";

function toggleLocale() {
  const next = getLocale() === "ar" ? "en" : "ar";
  setLocale(next);
  // Full reload re-runs applyHtmlDir() in main.tsx and re-evaluates
  // every t() call. Acceptable for v1 — cheaper than a context provider.
  globalThis.window.location.reload();
}

type Props = Readonly<{
  /*
    `title` kept on the prop surface so old callers still type-check.
    Each page now renders its own Large Title inside the content column,
    so the shell never renders a title bar above the outlet.
  */
  title?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  // `focus` hides the top nav — the old "presentation mode" flag for
  // when an advisor turns the laptop around on the report page.
  focus?: boolean;
}>;

/**
 * Apple-style AppShell.
 *
 * Translucent sticky nav at the top (Marsa wordmark on the inline-start,
 * blue text links, locale toggle + Sign out on the inline-end). Content
 * canvas is bg-grouped — the iOS default for list-style pages. No
 * sidebar. The shell does not wrap children in a card; pages compose
 * their own cards / grouped lists inside the content column.
 *
 * RTL: the nav is a flex row with `gap-*` — directionality flips via
 * the `<html dir="rtl">` attribute set by `applyHtmlDir()`. No `ml-*` /
 * `mr-*` to undo.
 */
export default function AppShell({ trailing, children, focus = false }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const nav = useNavigate();

  async function handleLogout() {
    await dispatch(logout());
    nav("/login");
  }

  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-bg-grouped text-label flex flex-col">
      {!focus && (
        <header className="app-nav print:hidden">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
            <Link
              to={user ? "/clients" : "/"}
              className="font-display text-[17px] font-semibold tracking-tight text-label"
              aria-label={APP_NAME}
            >
              {APP_NAME}
            </Link>
            <nav className="flex items-center gap-6 text-[15px] font-semibold">
              {user && (
                <>
                  <NavLink
                    to="/clients"
                    className={({ isActive }) =>
                      `text-system-blue hover:text-system-blue-hover transition ${
                        isActive ? "text-system-blue-hover" : ""
                      }`
                    }
                  >
                    {t("nav.clients")}
                  </NavLink>
                  <NavLink
                    to="/clients/new/profile"
                    className={({ isActive }) =>
                      `text-system-blue hover:text-system-blue-hover transition ${
                        isActive ? "text-system-blue-hover" : ""
                      }`
                    }
                  >
                    {t("nav.new_client")}
                  </NavLink>
                </>
              )}
              {trailing}
              <button
                type="button"
                onClick={toggleLocale}
                className="text-system-blue hover:text-system-blue-hover transition"
                aria-label="Toggle language"
                data-testid="locale-toggle"
              >
                {t("locale.toggle")}
              </button>
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-system-blue hover:text-system-blue-hover transition"
                >
                  {t("nav.signout")}
                </button>
              )}
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1 w-full max-w-6xl mx-auto pb-12 print:pb-4">
        {children}
      </main>
      <footer className="max-w-6xl mx-auto w-full px-6 py-6 text-xs text-label-tertiary print:hidden">
        {t("shell.footer", { year })}
      </footer>
    </div>
  );
}
