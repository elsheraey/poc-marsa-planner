# Marsa — Iteration 2 Readiness Report

**Owner:** QA lead
**Date:** 2026-04-18
**Scope:** Design-partner Alpha go/no-go — blocks nothing downstream.

This report is the handoff after iteration 2 final validation. The pytest and
Playwright suites are green on real data; the frontend renders honest
per-scenario probabilities; the disclosure banner ships with the live
calibration date. What follows is the checklist against the /loop stop
criteria, the remaining demo-quality gaps, the GA risks, and the
recommendation.

---

## Market-ready checklist (8 stop criteria)

Legend: ✅ shipped and verified · ⚠ shipped with a known follow-up · ❌ not shipped.

| # | Criterion | Status | Evidence (commit SHA / file) |
|---|---|---|---|
| 1 | **Real data** — Egypt market CSVs replace synthetic placeholders; calibration snapshot committed | ✅ | `6c73cca` (real CSVs), `e7ffdcf` (calibration snapshot), `e23fdee` (schema v2 reconcile). Manifest: `backend/data/calibration_2026-04.json`; μ/σ inside the widened spec §1 bands. |
| 2 | **Spec suite green** — market-spec acceptance suite passes on real data | ✅ | `70ae0fe`, `16c1fa4`, `bd0f9d7`. `cd backend && .venv/bin/pytest` → **78 passed**, 0 failed; incl. `test_simulate_scenarios[04_no_money_no_goal_positive]` now passing after the `1c78f93` boundary fix. |
| 3 | **SE shipped** — `probability_of_goal_se` on `SimulateResponse`, formula `sqrt(p(1-p)/N)` with N=10,000 | ✅ | `5affc4f`. Verified by `test_probability_of_goal_se_reported` and `test_probability_of_goal_se_matches_binomial_formula` in `backend/tests/test_market_spec.py`. SE ≤ 0.005 ceiling holds. |
| 4 | **Chart fix** — P15/P50/P85 ribbon no longer triple-stacks (optimistic ≥ median ≥ pessimistic in the table every row) | ✅ | `a70ebd4` (removed Recharts `stackId`), guarded by `tests-e2e/tests/stacking.spec.ts`. |
| 5 | **EGP format** — central `fmtEGP` / percent formatters; ad-hoc `$` strings removed from SimulationReport, ClientSummary, DonutChart | ✅ | `2023ca4`. Wire test: `tests-e2e/tests/currency.spec.ts`. Source: `frontend/src/utils/format.ts`. |
| 6 | **i18n** — dictionary-based en/ar scaffold with RTL toggle; copy read through `t()` | ⚠ | `a9a1b11`. Scaffolding + `lang`/`dir` plumbing done; `frontend/src/i18n/{en,ar,index}.ts` shipped and referenced by `SimulationReport.tsx`. **Arabic content is still minimal** — per `docs/next.md §3(1)` this is intentional ("no Arabic copy yet"). Gate passes for Alpha; not for Arabic-first demo. |
| 7 | **Attainability + disclosure** — attainability badge on the report; past-performance disclosure banner with live `calibration_as_of` | ✅ | Attainability: `0159e77`, `f48083b`, `a67c089`, `af38c79`. Disclosure banner: `88b1115` (backend `calibration_as_of`) + this QA pass (`SimulationReport.tsx :: DisclosureBanner`, `data-testid="simulation-disclosure"`). E2E: `tests-e2e/tests/disclosure.spec.ts` (hard-assert, skip path removed). Wire: `backend/tests/test_market_spec.py :: test_simulate_response_has_calibration_as_of`. |
| 8 | **Paying-customer path** — Egypt-first GTM narrative, design-partner packets, Azimut MOU path | ⚠ | `8d5468d` (design-partner outreach packets for Azimut, CFA Society, RM), `48da510` (2-week CEO action plan), `docs/outreach/{01-azimut-egypt,02-cfa-society-egypt,03-design-partner-rm}.md`. **Docs shipped, zero booked calls as of 2026-04-18.** Product is demo-ready for the first advisor; the conversion motion is CEO-owned, not engineering-blocked. |

**Overall:** 6 ✅, 2 ⚠, 0 ❌. No criterion is outright missing.

---

## What's still demo-quality

A sophisticated MENA advisor poking at this for 15 minutes will notice:

1. **Equity proxy is a 6-name EGX30 basket, not the actual Azimut ABC NAV history.** `docs/market-spec.md §2` acknowledges this openly (inflation-β likely understated 0.05-0.15). A PM familiar with the Azimut book will ask "why isn't this your fund's NAV?" and the honest answer is "because Azimut IR hasn't published it retrievably yet." Tracked in `docs/next.md` as Q3 work.
2. **MMF is synthetic, not a real fund NAV.** We compound the current-month 91d T-bill into an instantaneous yield; a real MMF lags ~60 days WAM. Documented as the MMF-proxy caveat in §2, but for a first-meeting demo we're one Azimut IR phone call away from replacing it.
3. **Arabic translations are stubs.** The i18n scaffold is real; the Arabic dictionary is mostly placeholder. First Cairo advisor who flips the language toggle will see English fallbacks through the report. Acceptable for an English-speaking design partner; not for regulator-facing demos.
4. **`importance` field is hardcoded to `"essential"` in `ScenarioStep.buildScenarioRequest`.** The UI lets the advisor set risk appetite but not goal importance — the field exists in `SimulateRequest` but isn't wired to a control yet.
5. **Calibration refresh is manual.** There's no scheduled job refitting from fresh data; `calibration_2026-04.json` is hand-regenerated via `backend/ingest.py`. A May run requires engineer action. Monthly cadence isn't automated.
6. **Client persistence is sparse.** `/clients` is a CRUD list; there's no simulation history per client, no PDF export, no "saved reports" view. Demo walks through the wizard every time.
7. **Rate limits are DEV values in the default `.env.example`** (`1000/minute` for login during QA). Production deploy needs `10/minute`, and the only enforcement is a grep in the deploy runbook.

---

## Known risks at GA

**Compliance exposure**
- **No FRA engagement yet.** `docs/next.md §2` has FRA fintech-enabler scoping as a CEO action; the memo isn't circulated. Running a "probability-of-goal" calculation in front of a retail-adjacent advisor without FRA clarity on whether this counts as regulated investment advice is the top legal risk. Mitigation today: disclosure banner (`report.disclosure.regulator`), attainability buckets instead of hard yes/no answers, no "buy this fund" recommendations in copy.
- **No audit log UI.** Advisors who need a paper trail (compliance-inspected boutiques) cannot reconstruct which inputs produced which report. Backend logs exist via structured logging (`5115cc5`) but there's no surface.
- **Data provenance is file-path-based.** `docs/data-sources.md` is accurate but not programmatically enforced — nothing stops someone swapping a CSV without rerunning `ingest.py`. The calibration snapshot's git_commit SHA catches drift on CI; local dev is on the honour system.

**Numerical gaps**
- **Kupiec backtest hasn't been published.** `docs/next.md §Analyst` lists `analyst-backtest-2026-04.md` as a deliverable; the file doesn't exist. Left-tail realism (equity real P15 ≤ -0.20, inflation MoM P99 ≥ 0.028) is a spec §3 requirement that we haven't demonstrated end-to-end on the real CSVs.
- **Gaussian copula is the dependency structure.** Tail co-movement during Mar-2024-style devaluations is underestimated vs. a t-copula or empirical block bootstrap. Spec §2 rank-order constraint is met; tail dependence is not separately measured.
- **Horizon cap is 40 years, scenario cap is 4.** `runScenarioBatch` limits to 4 concurrent scenarios (see `SimulationReport.MAX_SCENARIOS_RENDERED` mirrored by `ScenarioStep.MAX_SCENARIOS_PER_RUN`). Advisor with 6 scenarios will see a silent drop notification, not a hard error.

**UX gotchas**
- **Disclosure banner is collapsed by default.** An advisor who hands the report to a client as a PDF (print path) won't see the disclosure bullets unless they expand first. Print-to-PDF hasn't been tested with the banner state.
- **Per-scenario probability now varies across donuts** (the fake `-i*10` shift is gone). This is correct but it means advisors who eyeballed the old demo will see lower probabilities on scenarios 2-4 than before, because each scenario is a genuine independent simulation, not a cosmetic decrement. Expectation mismatch, not a bug.
- **No scenario-diff view.** Four donuts side-by-side; the advisor mentally computes the delta. A "what changes between scenarios" summary is missing.

**Operational**
- **Rate-limit bypass in dev still live.** `backend/.env` had `RATE_LIMIT_LOGIN=1000/minute` for the QA run; this QA pass reverts it to `10/minute` at commit time. If the value leaks into a deployment `.env` it's a credential-stuffing target.
- **Single-worker uvicorn in prod assumption.** `docker-compose.yml` + `docker-compose` dev setup is single-worker; the sim cache is per-process. Under Gunicorn with N workers, each worker does the 10k MC warm-up separately (first call per worker is ~8s cold). Not a Alpha-scale concern (3 design partners); a GA concern.

---

## Recommendation

**YES** — go for design-partner Alpha.

The engine is honest (Jensen compounding fixed, joint sampling real, real-terms default, attainability bucketed), the inputs are real Egypt data inside spec §1 bands, the disclosure shows the actual calibration snapshot date, the P95 warm latency is 45 ms against an 800 ms SLO (57× headroom), and both pytest (78/78 passing over 3 runs) and Playwright (9/9 passing over 2 runs) are stable. The two ⚠ items (i18n Arabic content, booked paying-customer calls) are CEO-owned and don't block an advisor walking through the wizard with an English-speaking design partner. The demo-quality gaps are honest caveats a CFA-charterholder advisor will accept for an Alpha conversation, not product failures — the equity proxy is documented in `docs/market-spec.md §2` with a Q3 commitment to replace it, and the MMF caveat has the same shape. The GA risks are real but not Alpha-blocking: FRA scoping is scheduled, audit logs and PDF export are Q3, Kupiec backtest is the analyst's next deliverable. Ship it to three design partners this week; run the first Cairo call before touching Q3 scope.

---

## Appendix — validation run numbers

- **Backend pytest:** 78 tests, 3 consecutive full runs, **0 flakes**. Wall time 22-25 s per run.
- **Playwright E2E:** 9 tests, 2 consecutive full runs, **0 flakes**. Wall time 17-21 s per run.
- **Warm P95 `/api/simulate`:** 45.4 ms (median 43.0 ms) across 10 calls after warm-up. Cold first call not measured here; historically ~6-8 s on the shared box.
- **`.env` hygiene:** `RATE_LIMIT_LOGIN` reverted from `1000/minute` (QA override) to `10/minute` (production-safe) in this commit.
- **New tests added this pass:**
  - `backend/tests/test_market_spec.py :: test_simulate_response_has_calibration_as_of` — asserts `calibration_as_of` on `/api/simulate` matches `^YYYY-MM$` or `^YYYY-MM-DD$`.
  - `tests-e2e/tests/disclosure.spec.ts` — graceful-skip branch removed; banner is now a hard assertion.
