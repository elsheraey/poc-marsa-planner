import { NavLink, useLocation } from "react-router-dom";

type Step = {
  to: string;
  label: string;
  tone: "primary" | "pink" | "cyan";
  icon: JSX.Element;
};

const steps: Step[] = [
  {
    to: "profile",
    label: "Profile",
    tone: "primary",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M4 10h16" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    to: "goals",
    label: "Goals",
    tone: "pink",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.7 7.1 18.2 8 12.7l-4-3.9L9.5 8 12 3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: "scenario",
    label: "Scenario Builder",
    tone: "cyan",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.8a7 7 0 0 0-2-1.2l-.4-2.6h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-.8-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-.8a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4.8 2-3.4-2-1.6A7 7 0 0 0 19 12z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const toneStyles: Record<Step["tone"], { active: string; inactive: string }> = {
  primary: {
    active: "bg-primary-100 text-primary-600",
    inactive: "text-primary-400 hover:text-primary-500",
  },
  pink: {
    active: "bg-accent-pink/10 text-accent-pink",
    inactive: "text-accent-pink/60 hover:text-accent-pink",
  },
  cyan: {
    active: "bg-accent-cyan/15 text-accent-cyan",
    inactive: "text-accent-cyan/60 hover:text-accent-cyan",
  },
};

export default function WizardTabs({ basePath }: { basePath: string }) {
  const location = useLocation();
  return (
    <div className="grid grid-cols-3 gap-6 mb-6">
      {steps.map((step) => {
        const href = `${basePath}/${step.to}`;
        const active = location.pathname.includes(step.to);
        const cls = toneStyles[step.tone];
        return (
          <NavLink
            key={step.to}
            to={href}
            className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition ${
              active ? cls.active : `bg-transparent ${cls.inactive}`
            }`}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-current/10">
              {step.icon}
            </span>
            {step.label}
          </NavLink>
        );
      })}
    </div>
  );
}
