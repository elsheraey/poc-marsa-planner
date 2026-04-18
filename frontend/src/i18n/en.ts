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

  "locale.toggle": "العربية",
};

export default en;
