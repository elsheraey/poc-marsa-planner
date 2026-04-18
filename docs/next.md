# Marsa — Next 2 Weeks

**From:** CEO
**To:** Marsa team
**Date:** 2026-04-18
**Re:** Decision and action plan for the next 14 days

## 1. This week's single priority: real Azimut NAV ingestion

We pick **(a) real Azimut NAV ingestion**, wired end-to-end with the market-spec guardrails. The strategy memo and the gap memo converge on the same conclusion: the moat we sold (superior simulation) is invisible until the inputs are real. The engine is now honest (Jensen fixed, copula joint, real toggle, attainability), but it is fitting **synthetic** CSVs that embed stale pre-2016 params — so every "credibility-saving" improvement the QA suite proves is undone the moment an advisor asks "where does this data come from?" Arabic/RTL, FRA, and the LLM narrative all depend on having numbers an advisor can defend in front of a client. Real data first, everything else second.

## 2. Two-week action list

| Owner | Task | Deliverable | Gate |
|---|---|---|---|
| Engineer | Replace `sample_data.py` default with real Azimut ABC Equity Fund 1 + AZ-Nasser MMF NAV history (monthly, ≥ 2023-01) and CBE Urban CPI MoM | Three real CSVs in `backend/data/`, loader refactor, calibration snapshot JSON | All 62 QA tests still green on real data |
| Engineer | Deploy-blocking fit-range guardrail per market-spec §1 (μ/σ bands) | CI fails if fitted μ/σ outside spec band | Spec §1 table enforced; intentional break reproduces failure |
| Engineer | Add `probability_of_goal_se` to `SimulateResponse`; cap `HORIZON_MONTHS` 480; fix snake→title-case string mismatch (`"Attainable"`, `"Aspirational"`, `"Out of reach"`) | Schema + response wired; UX consumes title-case directly | Spec §4(c), §5, §9 conflicts from §Conflicts-to-resolve closed |
| Analyst | Kupiec backtest of fitted marginals against 2016 + 2022-2024 empirical windows; publish P05 / P15 / P99 numbers | `analyst-backtest-2026-04.md` with pass/fail per spec §3 | Kupiec not rejected at 5% for equity P05 and inflation P99 |
| Analyst | Calibration snapshot governance: `calibration_2026-04.json`, input CSV SHAs, monthly re-fit runbook | Snapshot committed + runbook | One clean snapshot round-trip on CI |
| QA | Extend market-spec suite to run on real-data CSVs (all 12 rows in spec §8); add SE ≤ 0.005 assertion | Green suite on real data; SE assertion enforced | `pytest -m market_spec` green on real CSVs |
| UX | Unstack the P15/P50/P85 chart (overlapping bands, not additive), kill fabricated `probability - i*10` multi-scenario donut, wire real Print → `window.print` or remove, replace hard-coded `$` with `Intl.NumberFormat('ar-EG', {currency:'EGP'})` | PR against `SimulationReport.tsx`, `ClientSummary.tsx`, `DonutChart.tsx` | Screenshot diff reviewed; values visually match the table to the rial |
| UX | i18n scaffold only (react-i18next provider, `lang`/`dir` plumbing, EN strings extracted) — no Arabic copy yet | PR that compiles and renders English through i18n | All SimulationReport/Clients copy read through `t()` |
| CEO | Land 3 design-partner intro calls from warm network (CFA Society Egypt board, EFPSB, Azimut Egypt IR) | 3 calendar invites on the books before day 10 | Meetings scheduled, not just requested |
| CEO | Draft Azimut co-marketing MOU (1 page) and send to Azimut IR | MOU v0 sent, reply received or chased | Email thread exists; Azimut IR has acknowledged |
| CEO | FRA fintech-enabler scoping call with Egyptian fintech counsel | 1-page memo: timeline, cost band, data-residency constraint | Memo circulated internally |

## 3. What we say NO to for the next 2 weeks

1. **No Arabic copy or RTL visual QA.** Scaffold only. Arabic content waits on real data + partner feedback.
2. **No LLM narrative generator.** The 90-day bet does not start week 1; it starts once numbers are defensible.
3. **No advisor CRM, no PDF export pipeline, no audit log UI.** Scoped for Q3.
4. **No Celery/RQ worker migration.** In-process is fine for 3 design partners.
5. **No new distribution families, no HMM, no skew-t.** Ship the regime story in Q2 with what we have; don't perfect the engine while the inputs are fake.

## 4. Day-14 quantitative gates

1. **Real data live:** 3 CSVs in `backend/data/`, calibration snapshot committed, fitted μ/σ inside spec §1 bands. Binary.
2. **QA green on real data:** all 62 market-spec tests pass; SE ≤ 0.005 at N=10,000 for every §8 row. Binary.
3. **Left-tail realism:** simulated 12-month equity real P15 ≤ −0.20 and inflation MoM P99 ≥ 0.028. Binary.
4. **3 design-partner calls held** (not just booked) with independent FRA-licensed advisors. If <2, priority #1 was wrong — pivot week 3 to CEO-owned GTM.
5. **Azimut IR response received** — any signal, positive or negative. Silence for 14 days = outreach channel is broken, switch to CFA Society as primary wedge.

## 5. The first paying customer

**Segment:** independent FRA-licensed financial advisor, Greater Cairo, 2-10 advisor boutique — per gap-and-gtm.md §B1. Not a bank, not an insurer, not a brokerage RM.

**Named target:** **Azimut Egypt Asset Management** advisor network + the **CFA Society Egypt** board-linked boutiques (e.g., Arqaam Wealth, Beltone Financial Advisory, HC Securities wealth arm). Specifically: Ahmed Abou El Saad (Managing Director, Azimut Egypt) for a partnership conversation, and the CFA Society Egypt president for advisor-network access to independents.

**How I get the meeting in 10 days:**
- **Day 1-3:** LinkedIn warm intro through 2 mutual connections (my network includes ex-EFG Hermes and ex-CIB Wealth contacts). Target: Azimut IR + one CFA Society board member.
- **Day 4-7:** Send the 1-page Azimut MOU (co-marketing, no rev-share, we use their fund NAVs openly). Parallel: request 15 minutes at the next CFA Society Egypt monthly meetup.
- **Day 8-10:** First call held. If no warm path lands by day 7, I buy a table at the CFA Society Egypt forum and show up in person in Cairo week 3. **This is my week-1 CEO-owned action and it is not delegable.**

If by day 10 I have zero confirmed meetings, the problem is distribution, not product, and we re-rank priority #1 to (d) design-partner outreach for the following two weeks.
