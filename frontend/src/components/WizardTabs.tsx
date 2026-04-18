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
 * Editorial wizard step indicator.
 *
 *     01 / PROFILE  ·  02 / GOALS  ·  03 / SCENARIO
 *
 * Small-caps numerals, space-wide tracking, separator bullets between
 * steps. The active step is underlined with the terracotta accent — no
 * pill background, no icon, no rounded corner anywhere. Each step is a
 * NavLink so back / forward still works through the browser history.
 *
 * RTL: rendered as a flex row with logical bullet separators rendered
 * between items. Arabic numerals (01, 02, 03) stay Latin because the
 * dictionary drives the LABEL copy and the index is a UI marker, not a
 * locale-sensitive datum.
 */
export default function WizardTabs({ basePath }: Readonly<{ basePath: string }>) {
  const location = useLocation();
  return (
    <nav
      className="mb-10 text-xs uppercase tracking-widest text-ink-muted flex flex-wrap items-center gap-x-4 gap-y-2"
      aria-label="Wizard steps"
    >
      {steps.map((step, i) => {
        const href = `${basePath}/${step.to}`;
        const active = location.pathname.includes(step.to);
        const index = String(i + 1).padStart(2, "0");
        return (
          <span key={step.to} className="inline-flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden="true" className="text-ink-muted/60">
                ·
              </span>
            )}
            <NavLink
              to={href}
              className={
                active
                  ? "text-ink border-b-2 border-accent pb-1"
                  : "text-ink-muted hover:text-ink"
              }
            >
              <span className="tabular me-2">{index}</span>
              <span>/ {t(step.labelKey)}</span>
            </NavLink>
          </span>
        );
      })}
    </nav>
  );
}
