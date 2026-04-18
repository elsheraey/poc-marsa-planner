import { NavLink } from "react-router-dom";
import Logo from "./Logo";
import { t } from "../i18n";

type NavItem = { to: string; labelKey: string; icon: JSX.Element };

const items: NavItem[] = [
  {
    to: "/overview",
    labelKey: "nav.overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    to: "/clients",
    labelKey: "nav.clients",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M3 19c0-3 2.7-5 6-5s6 2 6 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M15 19c0-2 1.8-4 4-4s2 1 2 1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-[230px] shrink-0 bg-sidebar-gradient text-white relative overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
        viewBox="0 0 230 900"
        preserveAspectRatio="none"
      >
        <path
          d="M-20 650 Q 80 500 60 350 T 120 60"
          stroke="white"
          strokeWidth="1"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M-40 720 Q 100 560 80 400 T 140 100"
          stroke="white"
          strokeWidth="1"
          fill="none"
          opacity="0.25"
        />
        <path
          d="M-60 780 Q 130 620 100 440 T 160 140"
          stroke="white"
          strokeWidth="1"
          fill="none"
          opacity="0.15"
        />
      </svg>
      <div className="pt-8 pb-10 flex justify-center relative">
        <Logo variant="light" />
      </div>
      <nav className="flex flex-col gap-2 px-4 relative">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-white/20 text-white shadow-inner"
                  : "text-white/85 hover:bg-white/10"
              }`
            }
          >
            {it.icon}
            <span>{t(it.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
