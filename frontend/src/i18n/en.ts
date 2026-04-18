// English dictionary. Flat key → string; keys use dotted namespaces so
// we can group without the overhead of react-i18next.
const en: Record<string, string> = {
  "report.title": "Simulation report",
  "report.attainable": "Attainable",
  "report.aspirational": "Aspirational",
  "report.out_of_reach": "Out of reach",
  "report.disclosure": "Simulation details & disclosures",

  "report.disclosure.mc": "Simulation uses N=10,000 Monte Carlo scenarios.",
  "report.disclosure.real":
    "Results are in real (inflation-adjusted) EGP unless stated otherwise.",
  "report.disclosure.past":
    "Past performance does not guarantee future results.",
  "report.disclosure.data":
    "Data source: {calibration}. Simulation run at: {now}.",
  "report.disclosure.regulator":
    "Regulator: Financial Regulatory Authority (FRA) — Marsa is a tool, not a licensed investment advisor.",

  "nav.overview": "Overview",
  "nav.clients": "Clients",
  "nav.new_client": "Add New",
  "nav.signout": "Sign out",

  "auth.login": "Log in",
  "auth.register": "Register",

  "wizard.profile": "Profile",
  "wizard.goals": "Goals",
  "wizard.scenario": "Scenario Builder",
  "wizard.run_simulation": "Run Simulation",

  "report.headline.met":
    "Plan reaches the goal at ~{pct}% confidence.",
  "report.headline.shortfall":
    "At EGP {monthly}/month, this plan reaches the goal with ~{pct}% confidence.",
  "report.headline.no_goal":
    "No goal amount set — the projection below is informational.",
  "report.suggest.monthly":
    "Raise the monthly contribution to about EGP {monthly} to reach the goal at 80% confidence (approx.).",
  "report.suggest.year":
    "Keep contributions as-is and extend the horizon to {year} — the median projection reaches the goal that year.",
  "report.suggest.none":
    "No simple inversion available — re-run with different inputs to explore.",

  "report.action.present": "Present to client",
  "report.action.exit_present": "Exit presentation mode",
  "report.action.print": "Print",
  "report.action.save": "Save simulation",
  "report.action.back": "Back to scenarios",

  "report.section.probability": "Goals Achievement Probability",
  "report.section.projection": "Projection",
  "report.section.scenarios": "Scenarios",

  "landing.title": "Answer your client's next question in thirty seconds.",
  "landing.subtitle":
    "Marsa turns your Monte Carlo into a conversation — in Arabic or English.",
  "landing.body":
    "Built for Egyptian financial advisors to run credible, inflation-aware plans in front of the client. Real EGP, real regimes, real decisions.",
  "landing.cta": "Advisor sign-in",

  "locale.toggle": "العربية",
};

export default en;
