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
    `title` used to render inside a dashboard "TopBar"; now the page
    itself renders its own display headline inside the editorial column,
    so the shell doesn't put a title bar above the content at all. Kept
    on the prop surface so every existing caller still type-checks.
  */
  title?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  // `focus` was the old "presentation mode" flag that hid the sidebar.
  // There is no sidebar any more, so the flag only controls whether the
  // top nav is rendered — useful on the report page when the advisor
  // turns the laptop to the client.
  focus?: boolean;
}>;

/**
 * Editorial AppShell.
 *
 * A single-column document layout. One hairline-separated nav at the top
 * (logo + the two real router destinations + locale toggle + Sign out),
 * then the page renders its own rhythm inside a 5xl editorial column. No
 * sidebar, no card wrapper around children, no drop-shadowed chrome.
 *
 * RTL: the nav uses `gap-*` + flex ordering, not `ml/mr`, so mirroring
 * into Arabic (`<html dir="rtl">`) happens automatically. The logo stays
 * at the logical "start" side of the flex row regardless of direction.
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
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {!focus && (
        <header className="border-b border-rule print:hidden">
          <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between gap-6">
            <Link
              to={user ? "/clients" : "/"}
              className="font-serif text-xl tracking-tight text-ink"
              aria-label={APP_NAME}
            >
              {APP_NAME}
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              {user && (
                <>
                  <NavLink
                    to="/clients"
                    className={({ isActive }) =>
                      `text-ink hover:underline underline-offset-4 ${
                        isActive ? "underline decoration-accent" : ""
                      }`
                    }
                  >
                    {t("nav.clients")}
                  </NavLink>
                  <NavLink
                    to="/clients/new/profile"
                    className={({ isActive }) =>
                      `text-ink hover:underline underline-offset-4 ${
                        isActive ? "underline decoration-accent" : ""
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
                className="text-ink-muted hover:text-ink hover:underline underline-offset-4"
                aria-label="Toggle language"
                data-testid="locale-toggle"
              >
                {t("locale.toggle")}
              </button>
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-ink-muted hover:text-ink hover:underline underline-offset-4"
                >
                  {t("nav.signout")}
                </button>
              )}
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1 w-full max-w-5xl mx-auto px-8 py-12 print:py-6">
        {children}
      </main>
      <footer className="max-w-5xl mx-auto w-full px-8 py-6 text-xs uppercase tracking-widest text-ink-muted print:hidden">
        {t("shell.footer", { year })}
      </footer>
    </div>
  );
}
