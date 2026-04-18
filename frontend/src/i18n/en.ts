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

  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.save": "Save",

  "client.modify": "Modify",
  "client.section.info": "Client information",
  "client.section.coClient": "Co-client",
  "client.section.incomeSources": "Income sources",
  "client.section.dependents": "Dependents",
  "client.section.assets": "Assets",
  "client.section.debts": "Debts",
  "client.section.goals": "Goals",
  "client.field.fullName": "Full name",
  "client.field.mobile": "Mobile",
  "client.field.email": "Email",
  "client.field.birthdate": "Birthdate",
  "client.field.employmentStatus": "Employment status",
  "client.field.employmentIncome": "Employment income",
  "client.tile.riskAppetite": "RISK APPETITE",
  "client.tile.totalAssets": "TOTAL ASSETS",
  "client.tile.totalDebts": "TOTAL DEBTS",
  "client.tile.monthlyExpenses": "MONTHLY EXPENSES",
  "client.col.source": "Source",
  "client.col.amount": "Amount",
  "client.col.annualIncrease": "Annual increase",
  "client.col.asset": "Asset",
  "client.col.debt": "Debt",
  "client.col.duration": "Duration",
  "client.col.interestRate": "Interest rate",
  "client.col.goal": "Goal",
  "client.col.year": "Year",
  "client.empty.coClient": "No co-client recorded.",
  "client.empty.incomeSources": "No income sources yet",
  "client.empty.dependents": "No dependents yet",
  "client.empty.assets": "No assets yet",
  "client.empty.debts": "No debts yet",
  "client.empty.goals": "No goals yet",
  "client.empty.addOne": "Add one",
  "client.years": "{n} years",

  "profile.section.required": "Personal info",
  "profile.section.dossier": "Advanced profile (optional)",
  "profile.section.dossier.help":
    "Dependents, income sources, assets, debts, co-client and expenses. These fields are stored but are not required to run a simulation.",
  "profile.field.fullName": "Full name",
  "profile.field.email": "Email",
  "profile.field.birthdate": "Birthdate",
  "profile.field.phone": "Phone",
  "profile.field.employmentStatus": "Employment status",
  "profile.field.riskAppetite": "Risk appetite",
  "profile.employmentStatus.select": "Select",
  "profile.employmentStatus.employed": "Employed",
  "profile.employmentStatus.selfEmployed": "Self-employed",
  "profile.employmentStatus.retired": "Retired",
  "profile.employmentStatus.unemployed": "Unemployed",
  "profile.risk.very_low": "Very low",
  "profile.risk.low": "Low",
  "profile.risk.moderate": "Moderate",
  "profile.risk.high": "High",
  "profile.risk.very_high": "Very high",
  "profile.dossier.coClient": "Co-client",
  "profile.dossier.dependents": "Dependents",
  "profile.dossier.incomeSources": "Income sources",
  "profile.dossier.assets": "Assets",
  "profile.dossier.debts": "Debts",
  "profile.dossier.monthlyExpenses": "Average monthly expenses",
  "profile.dossier.employmentIncome": "Employment income",
  "profile.dossier.source": "Source",
  "profile.dossier.amount": "Amount",
  "profile.dossier.annualIncrease": "Annual increase (%)",
  "profile.dossier.asset": "Asset",
  "profile.dossier.debt": "Debt",
  "profile.dossier.duration": "Duration (years)",
  "profile.dossier.interestRate": "Interest rate (%)",
  "profile.dossier.relation": "Relation",
  "profile.dossier.relation.son": "Son",
  "profile.dossier.relation.daughter": "Daughter",
  "profile.cta.cancel": "Cancel",
  "profile.cta.proceed": "Proceed to Goals",

  "report.se.tail": "± {pp} pp",
};

export default en;
