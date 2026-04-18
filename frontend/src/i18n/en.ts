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
    "Regulator: Financial Regulatory Authority (FRA) — {appName} is a tool, not a licensed investment advisor.",

  "nav.overview": "Overview",
  "nav.clients": "Clients",
  "nav.new_client": "Add New",
  "nav.signout": "Sign out",

  "auth.login": "Log in",
  "auth.register": "Register",

  "auth.login.heading": "Financial Advisor Login",
  "auth.login.subheading":
    "Log in to run credible, inflation-aware financial plans for your Egyptian clients.",
  "auth.login.welcome": "Welcome to {appName}",
  "auth.login.email": "Email",
  "auth.login.email_placeholder": "Email address",
  "auth.login.password": "Password",
  "auth.login.password_placeholder": "Password",
  "auth.login.submit": "Login",
  "auth.login.submitting": "Signing in...",
  "auth.login.need_account": "Don't have an account?",
  "auth.login.sign_up": "Sign up",
  "auth.login.toast.success": "Signed in",

  "auth.register.heading": "Create account",
  "auth.register.subheading": "Start managing client portfolios in minutes.",
  "auth.register.welcome": "Create your {appName} account",
  "auth.register.name": "Full name",
  "auth.register.email": "Email",
  "auth.register.password": "Password",
  "auth.register.confirm_password": "Confirm password",
  "auth.register.submit": "Create account",
  "auth.register.submitting": "Creating account...",
  "auth.register.have_account": "Already have an account?",
  "auth.register.sign_in": "Sign in",
  "auth.register.toast.success": "Account created",

  "auth.error.email_required": "Enter a valid email address",
  "auth.error.email_invalid": "Enter a valid email",
  "auth.error.password_required": "Password is required",
  "auth.error.password_min": "Password must be at least 8 characters",
  "auth.error.name_required": "Name is required",
  "auth.error.password_mismatch": "Passwords do not match",

  // Localised counterparts to backend `errors.py` error codes. Keys are
  // looked up as `auth.error.server.<code>` — if present, the banner renders
  // the localised string; otherwise it falls back to the raw upstream
  // `message` (the English detail string from HTTPException). Keep these
  // in sync with the code map in `backend/app/errors.py`.
  "auth.error.server.unauthorized": "Incorrect email or password.",
  "auth.error.server.conflict": "This email is already registered.",
  "auth.error.server.validation_error":
    "Please check the form and try again.",
  "auth.error.server.rate_limited":
    "Too many attempts. Wait a minute and try again.",
  "auth.error.server.default": "Something went wrong. Please try again.",

  "wizard.profile": "Profile",
  "wizard.goals": "Goals",
  "wizard.scenario": "Scenario Builder",
  "wizard.run_simulation": "Run Simulation",

  "report.headline.met":
    "Plan reaches the goal at ~{pct}% confidence.",
  "report.headline.shortfall":
    "At {monthly}/month, this plan reaches the goal with ~{pct}% confidence.",
  "report.headline.no_goal":
    "No goal amount set — the projection below is informational.",
  "report.suggest.monthly":
    "Raise monthly to {monthly} to reach 80%.",
  "report.suggest.horizon":
    "Extend the horizon to {year} or review the goal.",
  "report.suggest.unreachable":
    "This goal is out of reach under any monthly plan in our model.",
  "report.suggest.none":
    "No simple inversion available — re-run with different inputs to explore.",

  "report.action.present": "Present to client",
  "report.action.exit_present": "Exit presentation mode",
  "report.action.print": "Print",
  "report.action.save": "Save simulation",
  "report.action.saving": "Saving…",
  "report.action.saved": "Saved",
  "report.action.back": "Back to scenarios",

  "report.save.prompt": "Name this simulation",
  "report.save.toast.success": "Saved simulation '{name}'",

  "report.section.probability": "Goals Achievement Probability",
  "report.section.projection": "Projection",
  "report.section.scenarios": "Scenarios",

  "landing.title": "Answer your client's next question in thirty seconds.",
  "landing.subtitle":
    "{appName} turns your Monte Carlo into a conversation — in Arabic or English.",
  "landing.body":
    "Built for Egyptian financial advisors to run credible, inflation-aware plans in front of the client. Real EGP, real regimes, real decisions.",
  "landing.cta": "Open the portal",
  "landing.footer": "© {year} {appName}",

  "landing.section.credible.title": "A considered answer, not a dashboard.",
  "landing.section.credible.body":
    "Every figure is a Monte-Carlo estimate with its standard error on the page. No pie charts, no gauge dials, no invented precision.",
  "landing.section.inflation.title": "Inflation-aware, in EGP.",
  "landing.section.inflation.body":
    "Projections are expressed in real Egyptian pounds. The calibration manifest and data window appear alongside every report — so the advisor, not the chart, carries the credibility.",
  "landing.section.arabic.title": "Readable in Arabic or English.",
  "landing.section.arabic.body":
    "The entire document mirrors cleanly into right-to-left. A client reading the report in Arabic sees the same hairline rules and the same considered typography the advisor sees.",

  "shell.footer": "© {year}, Developed by {appName}",

  "locale.toggle": "العربية",

  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.save": "Save",

  "client.modify": "Modify",
  "client.notFound": "Client not found. It may have been deleted.",
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

  "client.section.savedSims": "Saved simulations",
  "client.savedSims.empty": "No saved simulations yet.",
  "client.savedSims.error": "Could not load saved simulations.",
  "client.savedSims.col.name": "Name",
  "client.savedSims.col.createdAt": "Created at",
  "client.savedSims.col.probability": "Probability of goal",
  "client.savedSims.col.attainability": "Attainability",
  "client.savedSims.col.actions": "Actions",
  "client.savedSims.delete": "Delete",
  "client.savedSims.confirmDelete": "Delete saved simulation '{name}'?",

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

  "wizard.profile.error.fullName": "Full name is required",
  "wizard.profile.error.email": "Enter a valid email",
  "wizard.profile.error.birthdate":
    "Enter a valid birthdate in the past (dd/mm/yyyy)",
  "wizard.profile.error.phone": "Enter a phone number (6–32 characters)",
  "wizard.profile.error.employmentStatus": "Select an employment status",
  "wizard.profile.error.riskAppetite": "Select a risk appetite",

  "wizard.goals.error.name": "Goal name is required",
  "wizard.goals.error.amount": "Amount must be greater than zero",
  "wizard.goals.error.year": "Year must be this year or later",

  "wizard.scenario.duplicate": "Duplicate",
  "wizard.scenario.duplicate.atCap":
    "Cannot duplicate: already at {max} scenarios",

  "report.se.tail": "± {pp} pp",
};

export default en;
