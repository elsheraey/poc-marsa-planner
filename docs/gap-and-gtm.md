# Marsa — Gap Analysis & Go-to-Market

**From:** CEO
**To:** Marsa team
**Date:** 2026-04-18
**Re:** Honest read on v1 vs. the April memo, and how we sell Egypt first

## Part A — Gap analysis

The April [strategy memo](./strategy.md) picked three pillars: a **superior simulation engine**, **Arabic-first narratives**, and **advisor productivity**. Six weeks in, here is where each actually stands.

**Superior simulation engine — Embryonic.** The engine ([`backend/app/sim/engine.py`](../backend/app/sim/engine.py)) fits a single global marginal (`norm`/`t`/`laplace`) to a whole history via KS p-value, samples each asset **independently**, and aggregates 12 months by arithmetic mean — a [Jensen-gap bug](./analyst-report.md) the analyst flagged (`monthly_to_yearly`). There is no regime detection, no Cholesky, no FX shock, no EGP jump component. Worse, the PDF-supplied equity μ = 0.624%/mo is **pre-2016-float** and roughly 3× too low, producing a negative risk premium vs. a 21% CBE deposit rate. The `ba90eb4` fix decoupled probability-of-goal from importance percentile — necessary, not differentiating. Until the correlated / real-terms / regime work lands, we are a normal-fit with an over-optimistic μ wearing a boardroom skin.

**Arabic-first narratives — Missing.** There is no i18n scaffold in the frontend: no `react-i18next`, no `dir="rtl"`, no `lang` attribute, no Arabic-numeral toggle. Currency is hard-coded `$` in [`ClientSummary.tsx`](../frontend/src/pages/ClientSummary.tsx) and `SimulationReport.tsx`. The 90-day LLM narrative generator is **not started** — no `llm/`, `narrative/`, no SDK dependency, no prompt directory. The frontier bet from strategy.md §6 is vapor.

**Advisor productivity — Embryonic.** The wizard works and the draft persists, but the Print button at [`SimulationReport.tsx:116`](../frontend/src/pages/SimulationReport.tsx#L116) is cosmetic — no `onClick`, no `window.print`, no PDF pipeline. No client report export, no advisor CRM, no audit log, no suitability questionnaire, no bulk client import. The [UX audit](./ux-audit.md) catalogued ~20 UX defects the advisor will hit in their first meeting, including stacked band charts rendering at ~3× real value and a fabricated multi-scenario probability.

**Data pipeline — Missing.** [`sample_data.py`](../backend/app/sim/sample_data.py) still generates synthetic CSVs using the stale PDF params. No Azimut IR feed, no Zeed scrape, no CBE inflation pull. The three placeholder CSVs in `backend/data/` ship by default. The analyst gave us a tiered plan — none of it is wired.

**Compliance posture — Missing.** Zero FRA Decree 58/2018 references in code. No CBE data-residency considerations. No legal page, no Terms, no Privacy, no disclosures, no KYC/AML, no suitability record, no advisor license field on register (the [UX audit](./ux-audit.md) called this out at `Register.tsx:25`). For a regulated product in Egypt this is a disqualifier, not a polish item.

**The credibility gap.** A sophisticated MENA advisor who downloads the demo will conclude — in under ten minutes — that (1) the numbers are wrong in both directions (stacked chart, stale μ), (2) there is no Arabic, no EGP, no local context baked in, and (3) there is nothing to hand a client afterwards. They won't pay. The moat we picked — simulation — is the one pillar we haven't actually built yet.

## Part B — Go-to-market

**1. Target segment: independent FRA-licensed financial advisors and small boutique wealth firms (2-10 advisors) in Greater Cairo and Alexandria.** Bank wealth desks (CIB Wealth, QNB AlAhli Private) have captive tooling and a 12-month procurement cycle. Insurance advisors (Allianz, MetLife) sell products, not plans. Brokerage RMs at EFG Hermes One / Thndr are execution-first. Independents are the one segment that (a) writes client-facing narratives manually today, (b) can sign a contract without a steering committee, and (c) lose deals *because* they can't show a credible Monte Carlo. That is our buyer.

**2. Sales motion: founder-led top-down, with a bottoms-up self-serve trial after Beta.** First 25 logos are closed by me and the sales lead in person. No inbound funnel yet — we don't have the brand. Partner channel realism: **Azimut Egypt** is plausible because our placeholder fund *is* their ABC Equity Fund — a co-marketing MOU (not rev-share) is a 60-day ask. **CIB and Banque Misr** are 18-month enterprise plays; park them. **EFG Hermes** will build their own; avoid direct conflict, target the advisors who sell *across* EFG and Azimut.

**3. Pricing: per-seat SaaS, EGP-denominated, with a per-client cap.** Egyptian independent advisors earn roughly **1.0-1.5% AUM management fee** (Azimut-tier funds charge 1-2%; advisors split). At a $5k/client average book of 30 clients, annual advisor revenue is ~EGP 150-300k per seat. Capture ~5% of that: **EGP 12,000/seat/year (~USD 240)**, billed annually, including up to 50 client simulations/year. Overage EGP 150 per extra client. No rev-share with fund managers at launch — it contaminates the "independent advice" positioning and is a compliance nightmare.

**4. Regulatory gate.** Egypt's FRA regulates **non-banking financial services** under Law 10/2009 and specifically fintech under FRA Decree 58/2018 and the 2022 Fintech Law. To legally charge an advisor who uses our output in a regulated recommendation, we need: (a) a clear statement we are a **software tool**, not a licensed advisor — the advisor owns the suitability recommendation; (b) FRA fintech-enabler registration (est. 3-6 months, ~EGP 500k-1M in legal + capital); (c) local data residency for client PII (Egypt's Personal Data Protection Law 151/2020 — AWS me-south-1 or Cairo-based hosting); (d) KYC on the advisor at signup (firm + FRA license number + national ID). Owner: fractional compliance lead starting Phase 2, full-time by GA. Until FRA registration clears, we bill the **advisor's firm** for the SaaS, not the end client.

**5. Distribution wedge: sponsor the CFA Society Egypt annual forum and the Egyptian Financial Planning Standards Board (EFPSB) CFP prep curriculum.** Every serious Egyptian advisor sits one of those exams. If our simulator is the tool used in the CFP case-study module, we own mindshare for a decade. Secondary wedge: one Arabic finance YouTuber (Mohamed Farid / Finance Shorts) running a series on "how real advisors stress-test a goal" — demoing our regime engine once it ships.

**6. Launch sequence.**
- **Alpha (May-July 2026)** — 3 design-partner advisors, free, white-glove onboarding. Milestones: real Azimut NAVs live, CPI-deflated reporting, correlated sampling, attainability badge, Arabic RTL skeleton. Gate: all three advisors run a real client meeting on Marsa.
- **Beta (Aug-Nov 2026)** — 15-25 paying advisors at 50% launch price (EGP 6k/seat). Milestones: FRA fintech-enabler filing in, regime v0 (2-state HMM), Arabic narrative generator v1, PDF report export. Gate: NPS ≥ 40, ≥80% weekly active, ≥10 advisors willing to be a public reference.
- **GA (Q1 2027)** — open sign-up, EGP 12k/seat, CFA Society partnership live. Milestones: FRA registration granted, 2-custodian integration talks, stress scenario library shipped.

**7. North-star metric: weekly active advisors running ≥3 client simulations.** Counter-metrics to catch cheating: (i) **median simulation-to-report time** — if it drops below 90 seconds we are being used as a button-press, not an advisor tool; (ii) **attainability-badge distribution** — if >90% of goals land "Attainable" we are selling false comfort; (iii) **advisor-reported client meetings held using the tool** (self-attested monthly) — decouples usage from meaningful advice.

**8. Kill criteria.** Alpha → Beta: kill if ≤2 of 3 design partners run a live client meeting, or if the regime engine is invisible to advisors in blind comparison. Beta → GA: kill if <10 paying advisors at 6 months, <50% gross retention at 90 days, or if FRA signals the fintech-enabler is >18 months out. GA: kill Egypt-first if 12-month ARR <USD 250k or if CAC payback exceeds 18 months — pivot to B2B simulation API for regional banks.
