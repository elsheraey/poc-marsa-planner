import { NavLink, useLocation } from "react-router-dom";
import { t } from "../i18n";

type Step = {
  to: string;
  labelKey: string;
  tone: "primary" | "accent" | "navy";
  icon: JSX.Element;
};

const steps: Step[] = [
  {
    to: "profile",
    labelKey: "wizard.profile",
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
    labelKey: "wizard.goals",
    // The middle wizard step used to be a pink star. Post-rebrand it
    // renders as an ochre star — same glyph, palette-correct tone.
    tone: "accent",
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
    labelKey: "wizard.scenario",
    // Scenario step was cyan; swap to deep navy (primary-900) so the
    // wizard shows a two-tone navy + ochre progression, not a rainbow.
    tone: "navy",
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
    active: "bg-primary-100 text-primary-700",
    inactive: "text-primary-500/70 hover:text-primary-700",
  },
  accent: {
    active: "bg-accent-soft/40 text-accent",
    inactive: "text-accent/70 hover:text-accent",
  },
  navy: {
    active: "bg-primary-100 text-primary-900",
    inactive: "text-primary-900/60 hover:text-primary-900",
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
            {t(step.labelKey)}
          </NavLink>
        );
      })}
    </div>
  );
}
