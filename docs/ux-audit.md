# Marsa — UX Audit

Reviewer: Senior UX designer, April 2026. Focus: advisor-facing portal, client
onboarding, Monte Carlo report.

## 1. Overall journey assessment

The skeleton is right — Clients → Profile → Goals → Scenario → Report — and
the visual language is boardroom-polished. What is missing is the *advisory
layer* on top of the data-entry layer. The product behaves like a form that
computes a number; a planning tool should behave like a partner that pushes back
when inputs don't make sense. The flow never tells the advisor whether
inputs are coherent (currency, units, magnitudes), whether a goal is
feasible, or what 50/70/90% actually means for a 2028 down-payment. With
the known algorithm bug on top, the advisor has no line of defense between
a bad number and a bad recommendation.

## 2. Screen-by-screen friction log

| Screen | Issue | Sev | Fix |
| --- | --- | --- | --- |
| Landing [`Landing.tsx:42`](../frontend/src/pages/Landing.tsx#L42) | Hero copy targets end-investors, CTA targets advisors | minor | Re-voice to advisors |
| Login [`Login.tsx:120`](../frontend/src/pages/Login.tsx#L120) | No forgot-password, 2FA, remember-me | major | Add recovery + 2FA slot |
| Register [`Register.tsx:25`](../frontend/src/pages/Register.tsx#L25) | Weak password rule, no firm/licence field for a regulated product | major | Strength meter + firm fields |
| ClientsList [`ClientsList.tsx:100`](../frontend/src/pages/ClientsList.tsx#L100) | Sort arrows decorative — click does nothing (false affordance) | major | Wire or remove |
| ClientsList [`ClientsList.tsx:131`](../frontend/src/pages/ClientsList.tsx#L131) | Row "…" has no menu | minor | Implement or remove |
| ProfileStep [`ProfileStep.tsx:52`](../frontend/src/pages/NewClient/ProfileStep.tsx#L52) | Birthdate is free-text, no mask/validation | critical | Native date picker |
| ProfileStep [`ProfileStep.tsx:82`](../frontend/src/pages/NewClient/ProfileStep.tsx#L82) | No currency label; summary later renders `$` | critical | Per-client currency + inline unit |
| ProfileStep [`ProfileStep.tsx:392`](../frontend/src/pages/NewClient/ProfileStep.tsx#L392) | Risk appetite is 5 opaque labels | major | Questionnaire or tooltips |
| ProfileStep [`ProfileStep.tsx:411`](../frontend/src/pages/NewClient/ProfileStep.tsx#L411) | "Save" only navigates — no persistence | critical | Persist draft + "saved Xs ago" |
| GoalsStep [`GoalsStep.tsx:65`](../frontend/src/pages/NewClient/GoalsStep.tsx#L65) | "Payments" ambiguous | major | Rename "Instalments (1 = lump sum)" |
| GoalsStep [`GoalsStep.tsx:82`](../frontend/src/pages/NewClient/GoalsStep.tsx#L82) | Inflation defaults 0; Egypt CPI ~20% | critical | Prefill CPI; warn on 0 |
| GoalsStep [`GoalsStep.tsx:108`](../frontend/src/pages/NewClient/GoalsStep.tsx#L108) | No feasibility signal on goal | critical | Attainability badge (§3) |
| ScenarioStep [`ScenarioStep.tsx:189`](../frontend/src/pages/NewClient/ScenarioStep.tsx#L189) | Goal pills show only name | minor | `Name · year · amount` |
| ScenarioStep [`ScenarioStep.tsx:357`](../frontend/src/pages/NewClient/ScenarioStep.tsx#L357) | `runAll` ignores rows >0 of `monthlyInvestments.annualIncrease` | critical | Sum correctly or restrict to 1 row |
| ScenarioStep [`ScenarioStep.tsx:368`](../frontend/src/pages/NewClient/ScenarioStep.tsx#L368) | `importance` hard-coded `"essential"` | major | Derive from goal |
| SimulationReport [`SimulationReport.tsx:42`](../frontend/src/pages/SimulationReport.tsx#L42) | Multi-scenario probability fabricated: `probability - i*10` | critical | Real per-scenario sims; else gate to 1 |
| SimulationReport [`SimulationReport.tsx:126`](../frontend/src/pages/SimulationReport.tsx#L126) | "10,000 simulations run" vanity; no interpretation of % | critical | Explain 70%; show CI |
| SimulationReport [`SimulationReport.tsx:219`](../frontend/src/pages/SimulationReport.tsx#L219) | `stackId="1"` stacks pessimistic+median+optimistic (~3× real value) | critical | Unstack; overlapping bands |
| SimulationReport [`SimulationReport.tsx:203`](../frontend/src/pages/SimulationReport.tsx#L203) | Chart "thousands", table raw | major | Unify via `Intl.NumberFormat` |
| ClientSummary [`ClientSummary.tsx:69`](../frontend/src/pages/ClientSummary.tsx#L69) | Hard-coded `$`, net worth, co-client, debts, dependents — demo data for every client | critical | Render from client record; empty states |
| DonutChart [`DonutChart.tsx:39`](../frontend/src/components/DonutChart.tsx#L39) | `.toFixed(2)` implies false precision | minor | Nearest 1%, `~` prefix |
| WizardTabs [`WizardTabs.tsx:76`](../frontend/src/components/WizardTabs.tsx#L76) | `includes()` match; no completeness indicator | major | Exact match + step check marks |
| Sidebar [`Sidebar.tsx:5`](../frontend/src/components/Sidebar.tsx#L5) | "Overview" route missing — dead link | minor | Remove/stub |
| AppShell [`AppShell.tsx:15`](../frontend/src/components/AppShell.tsx#L15) | Footer hard-codes `© 2021` | minor | Dynamic year |
| TopBar [`TopBar.tsx:37`](../frontend/src/components/TopBar.tsx#L37) | "Sign out" plain text; accidental click wipes session | minor | Avatar menu + confirm |

## 3. The "probability = 70%" trap

The user's 6M EGP / 2028 / 20k-monthly case is arithmetically near-impossible
(undiscounted contributions reach ~600k). The UI flags nothing. Three fixes:

1. **Feasibility banner on Goal card and Report.** Compute
   `required_monthly ≈ inflated_goal / months / compound_factor` client-side.
   If contribution <40% of required, show a yellow banner: *"To fund this
   goal at 50% confidence you'd need ~190k/month. Current plan covers 11%.
   Consider extending to 2033 or raising contributions."* Converts a silent
   percentage into a coaching moment.

2. **Attainability badges under each DonutChart.** 70% means different things
   if median is 2× goal vs. barely grazing it. Three states: `Attainable`
   (median ≥ goal, pessimistic ≥ 70%), `Aspirational` (median ≥ goal,
   pessimistic < 50%), `Out of reach` (median < goal — force amber, override
   the donut green). Strongest single defense against the known engine bug.

3. **Required-contribution calculator on the report.** Two sliders: "To hit
   85% confidence, contribute **X/month** or push year to **Y**." Turns the
   report into a decision tool, not a verdict. No backend work.

## 4. Wizard flow specifics

Profile / Goals / Scenario is the right decomposition, but Profile is doing
too much: personal, co-client, dependents, incomes, assets, debts, expenses,
risk. Longest screen, most likely abandoned mid-meeting. Split into
"Household" and "Financial snapshot" as collapsible sub-cards with their
own save points.

Most skipped or misread fields:

- **Birthdate** — free text; advisors type "55" or "1970".
- **Annual increase** (incomes, monthly investments, goals) — % vs. fraction
  vs. absolute unclear. Suffix every % input with `%`.
- **Inflation** — Egypt 2026 CPI ~20%; 0 default hides long-horizon risk.
- **Payments** on a Goal — undefined semantics.
- **Scenario Model** — no description or expected return range; picked by gut.

Validation is toast-on-submit
([ScenarioStep.tsx:344](../frontend/src/pages/NewClient/ScenarioStep.tsx#L344)).
Move to field-level on blur, sticky summary ("Profile: 2 issues · Goals: OK"),
and disable "Run Simulation" only on blocking errors with a tooltip.

## 5. Accessibility / i18n

Egypt market: Arabic is non-negotiable and entirely missing. No `dir="rtl"`,
no `lang`, no i18n scaffold, no Arabic-numeral toggle, currency hard-coded
`$`. Before rollout: react-i18next provider and string extraction;
locale-driven `dir`; per-client currency (default EGP) via
`Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })`; audit
mirrored icons. Accessibility gaps: toggle switches
([ProfileStep.tsx:94](../frontend/src/pages/NewClient/ProfileStep.tsx#L94))
lack `role="switch"` / `aria-checked`; the Goal-picker
([ScenarioStep.tsx:52](../frontend/src/pages/NewClient/ScenarioStep.tsx#L52))
isn't a modal (no focus trap, no escape); DonutChart has no `role="img"`
/ `aria-label`; chart tab icons ≋ / ☰ are characters not labels; color-only
semantics throughout; `Enter` doesn't submit wizard steps.

## 6. Top 5 changes

1. **Attainability badge + feasibility banner (§3.1 + §3.2).** Effort M,
   impact critical. Catches the 70% nonsense; buys forgiveness when the
   engine glitches.
2. **Fix the chart: unstack bands, unify units, kill hard-coded `$`**
   ([SimulationReport.tsx:219](../frontend/src/pages/SimulationReport.tsx#L219),
   [ClientSummary.tsx:69](../frontend/src/pages/ClientSummary.tsx#L69)).
   Effort S, impact critical. Today the portfolio value shown is ~3× reality.
3. **Persist draft + save state across wizard steps.** Effort S, impact major.
   Advisors onboard across sittings.
4. **Currency + i18n foundation (EGP default, `ar` scaffold, RTL pass).**
   Effort M, impact major. Non-negotiable for the market.
5. **Fix validation timing and kill fake multi-scenario probabilities**
   ([SimulationReport.tsx:42](../frontend/src/pages/SimulationReport.tsx#L42)).
   Effort S, impact major. Two silent-failure classes gone.

Polish (forgot-password, sort arrows, footer year, ellipsis menus, dead
"Overview" link) is XS and rides along in the same sprint.
