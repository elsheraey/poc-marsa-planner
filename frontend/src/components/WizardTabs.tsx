import { NavLink, useLocation } from "react-router-dom";
import { t } from "../i18n";

type Step = {
  to: string;
  labelKey: string;
};

const steps: Step[] = [
  { to: "profile", labelKey: "wizard.profile" },
  { to: "goals", labelKey: "wizard.goals" },
  { to: "scenario", labelKey: "wizard.scenario" },
];

/**
 * iOS segmented control for the new-client wizard steps.
 *
 *   [ Profile | Goals | Scenario ]
 *
 * Outer track is a bg-secondary rounded pill; active segment lifts to
 * bg-primary with a subtle shadow. Each segment is a NavLink so back /
 * forward still works through the router. No numbered prefixes, no
 * serif type, no accent underline — matches Apple's iOS segmented-
 * control pattern.
 */
export default function WizardTabs({ basePath }: Readonly<{ basePath: string }>) {
  const location = useLocation();
  return (
    <nav
      className="mb-8 segmented w-fit"
      aria-label="Wizard steps"
    >
      {steps.map((step) => {
        const href = `${basePath}/${step.to}`;
        const active = location.pathname.includes(step.to);
        return (
          <NavLink
            key={step.to}
            to={href}
            className={`segmented-item ${active ? "segmented-item-active" : ""}`}
          >
            {t(step.labelKey)}
          </NavLink>
        );
      })}
    </nav>
  );
}
