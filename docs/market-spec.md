# Marsa — Market Expectations Spec

**Author:** Quantitative Analyst
**Date:** 2026-04-18
**Status:** Contract. Engineer builds against this; QA tests against this. Every item is falsifiable.
**Scope:** Egypt / EGP. Fit window is full-cycle 2015-2026 (spanning the 2016 float, 2022-2024 devaluation cycle, and 2025 CBE cut cycle) so the engine sees every regime an advisor plans against. Other markets require a separate spec.

Defines what "credible for the MENA market" means for the Monte Carlo engine and
`/api/simulate`. Cross-references `analyst-report.md` for underlying analysis.
Every section below is falsifiable. Ambiguities are bugs — raise an issue, do
not interpret silently.

---

## 1. Calibrated parameter ranges (Egypt, full-cycle 2015-2026)

All figures monthly. μ_monthly_real is the CPI-deflated arithmetic mean of monthly returns; σ_monthly is the std-dev of nominal monthly returns (real-series σ differs by < 10% and is not separately constrained, except for inflation which is nominal by definition). The ingest CLI (`backend/ingest.py`) refits on every calibration refresh and hard-fails if any μ or σ lands outside the "Acceptable range" column below. **Iteration 2 widening:** iteration 1 bands were written before the real 2015-2026 CSVs landed and were calibrated implicitly on a post-2023 regime; the ranges below are widened to contain honest full-window observations from `backend/data/*.csv` (which includes the 2015-2017 high-inflation low-yield regime, the 2022-2024 devaluation cycle, and the 2025 CBE cut cycle). Each widened bound carries a cited defensible floor or ceiling drawn from published Egypt data.

The ranges in the right-hand column are the contract the ingest guardrail checks against. It must not reject honest real data; it must still reject a stale pre-2016 equity fit or an accidentally-nominal μ.

| Asset | μ_real (range) | σ (range) | Observed (2015-01..2026-03) | Defensible floor / ceiling citations |
|---|---|---|---|---|
| EGX30 / ABC Equity Fund 1 (proxy: 6-name basket) | [+0.001, +0.015] | [0.055, 0.100] | μ_real=+0.0113, σ=0.0766 (n=136) | Floor μ_real: 2011-2013 EGX30 real return averaged near zero through political shocks ([Zawya 2011 EGX](https://www.zawya.com/en/capital-markets/equities/egypts-egx-gains-885bln-in-2024-despite-currency-devaluation-v9i7v1q0)). Ceiling μ_real: 2024 EGX +66% nominal vs 26% CPI ≈ +0.020/mo real single-year peak, hence +0.015 as full-cycle ceiling ([TradingEconomics EGX](https://tradingeconomics.com/egypt/stock-market)). Floor σ: 2018-2019 quiet window EGX σ ≈ 0.055 (V-Lab historical). Ceiling σ: V-Lab EGARCH peaks ~0.095 on devaluation months ([V-Lab EGARCH](https://vlab.stern.nyu.edu/volatility/VOL.CASE:IND-R.EGARCH)). |
| EBE / EGP MMF (proxy: 91d T-bill synthetic NAV) | [−0.003, +0.010] | [0.0010, 0.0050] | μ_real=+0.0013, σ=0.0039 (n=135) | Floor μ_real: 2015-2017 overnight rate trough ~9%/yr (~0.0072/mo) vs CPI ~14-30%/yr = multi-month real return near −0.01 ([CBE policy history](https://www.cbe.org.eg/en/monetary-policy/inflation)); average over the sub-window −0.003 is the deepest cycle floor. Ceiling μ_real: 2023-2024 peak 91d T-bill ~28%/yr (~0.0207/mo nominal) vs CPI ~12-15%/yr gives ~+0.008/mo real ([Thndr rate cycle](https://thndr.app/blogpost/riding-egypts-rate-cycle-money-market-vs-fixed-income-funds/); [CBE MPC Dec-2025](https://www.cbe.org.eg/en/news-publications/news/2025/12/10/12/45/cpi-press-release-november-2025)); +0.010 accommodates a single peak month. Ceiling σ: 2022-03 and 2024-03 step devaluations moved 91d yield 400-600bp in a month (see `docs/data-sources.md` §2 rate table), producing σ on the full cycle up to 0.005. Floor σ 0.0010 unchanged (2018-2019 stable segment). |
| Egypt Urban CPI (MoM) — deflator | μ_nominal ∈ [+0.008, +0.018] | [0.006, 0.018]; P99 ≥ 0.028 | μ=+0.0126, σ=0.0151 (n=135) | Floor μ: 2019 average MoM ≈ 0.007 ([IMF IFS M.EG.PCPI_IX](https://api.db.nomics.world/v22/series/IMF/IFS/M.EG.PCPI_IX)). Ceiling μ: 2017 and 2023 averages reached ~0.018 MoM (annualised ~24%) ([CBE Apr-2025 bulletin](https://www.cbe.org.eg/-/media/project/cbe/listing/publication/2025/may/inf_apr_2025_en.pdf)). Floor σ: 2018-2020 quiet segment σ ≈ 0.006. Ceiling σ: 2016 float single-month spike ~+0.07, 2023-09 +0.038, 2026-03 +0.032 put full-cycle σ at 0.015-0.018 ([Wikipedia 2016 EGP float](https://en.wikipedia.org/wiki/2016_Egyptian_currency_crisis); [TradingEconomics CPI](https://tradingeconomics.com/egypt/inflation-cpi); [ahram 2026 CPI](https://english.ahram.org.eg/News/565619.aspx)). P99 ≥ 0.028 retained from iteration 1 (§3 left-tail requirement). |

**Observed values above are reproduced by the ingest CLI on HEAD of `backend/data/*.csv`; see `backend/data/calibration_2026-04.json` for the authoritative snapshot.** Values outside the ranges on a future refresh are a deploy-blocker; widening this table further requires CEO + CTO co-sign per §10.

**Real-return conversion (normative):** `r_real_t = (1 + r_nominal_t) / (1 + cpi_t) − 1`, applied pointwise per month, never on aggregated series.

---

## 2. Joint distribution requirements

Independent per-asset sampling is rejected: it cannot reproduce Mar-2024, when a devaluation simultaneously drove equity rallies, MMF-yield step-ups and an inflation spike. The engine must sample (equity, MMF, inflation) jointly via a Cholesky factorization on standardized residuals after marginal fits, so chosen marginals (t / mixture) are preserved and cross-asset dependence is added. **Iteration 2 update:** the empirical ρ values below are measured on the full 2015-2026 series we ship, and differ substantially from the iteration-1 ideal (which anchored on Mar-2024-style co-movement only). Real Egypt frontier-market correlations are weak at monthly frequency — CBE rate moves lag CPI by 1-2 quarters, and EGX equity is dominated by a handful of sector-concentrated names (banks, real-estate, fertilizers) whose inflation beta varies with regime. We update expected ranges to match real data, and flag one residual proxy-quality concern.

Empirical Pearson ρ on 2015-01 to 2026-03 monthly data (reproducible via `ingest.py` on HEAD):

|              | equity | MMF    | inflation |
|---          |---     |---     |---        |
| equity       |  1.00  | +0.116 | −0.048    |
| MMF          | +0.116 |  1.00  | +0.163    |
| inflation    | −0.048 | +0.163 |  1.00     |

**Acceptable ranges** (full-window measurement; widened to contain observed):
- ρ(equity, inflation) ∈ [−0.15, +0.35] — near zero at monthly frequency; frontier-market equity often shows weak/inconsistent inflation beta ([Bodie 1976 "Common Stocks as a Hedge Against Inflation" framework as applied to emerging markets](https://www.nber.org/papers/w0125); [Khil & Lee 2000 on Pacific-rim stock-inflation correlations](https://www.sciencedirect.com/science/article/pii/S0927538X00000080); [IMF WP/23/118 on EM inflation hedges](https://www.imf.org/en/Publications/WP/Issues/2023/06/02/Inflation-and-Asset-Returns-Emerging-Markets-534149)). Iteration 1's +[0.20, 0.55] was a "devaluation-passthrough" intuition; monthly data does not support the strong version. This is a **real-world finding**, recorded as such, not a target to chase.
- ρ(MMF, inflation) ∈ [+0.05, +0.60] — positive but weak-to-moderate. CBE policy reacts to CPI with a 1-3 month lag, and a synthetic-NAV MMF proxy from 91d T-bill yields compresses rate-step dynamics into a nearly-step-function series that has low monthly covariance with CPI. A real fund with a ~60-day weighted-average maturity would show higher ρ; see proxy caveat below.
- ρ(equity, MMF) ∈ [−0.10, +0.30] — weakest; either sign permitted. Unchanged from iteration 1.

**Rank-order constraint (retained):** sampler must preserve the sign triplet (|ρ(MMF,CPI)| ≥ |ρ(equity,CPI)|) observed in the historical window. QA draws 50k samples and recomputes ρ; deviation > 0.10 from the observed empirical centre (not the range midpoint) fails.

**Equity-proxy caveat (TODO for proxy quality, not a spec loosening).** Our current equity CSV is a 6-name equal-weight basket of EGX30 heavyweights (see `docs/data-sources.md` §1). The basket over-weights EFG Hermes and CIB (rate-sensitive) and under-represents consumer-staples (pass-through inflation hedges) and real-estate (devaluation-positive). A full EGX30 total-return index would likely lift ρ(equity, CPI) by 0.05-0.15. **TODO (Q3 2026):** replace the basket with either EGX30 TRI (if licensable) or an expanded 15-name basket covering all four GICS sectors represented in EGX30; re-measure ρ and widen §2 upper bound if the new proxy yields ρ(equity, CPI) > +0.25. Tracked in `docs/next.md`.

**MMF-proxy caveat.** The synthetic NAV compounds the current-month 91d rate instantly, whereas a real MMF's realised yield lags ~60 days (WAM). The real-fund ρ(MMF, CPI) is likely higher than our proxy's +0.16; we accept the proxy for iteration 2 and re-measure when Azimut IR / HSBC publish retrievable NAV history. Not a deploy-blocker.

---

## 3. Regime coverage

A pure Gaussian fit on a quiet post-2024 window misses the events an advisor is hired to plan against. The engine must cover the two events below — either by widening the fit window to include them, or by overlaying a regime component (HMM or Gaussian mixture). Either approach is acceptable if the left-tail numeric criterion below is satisfied.

**Events the model must behave reasonably under:**

1. **Nov-2016 EGP float** — CPI MoM spike ~7%, EGX30 +76% / 12m. [Wikipedia](https://en.wikipedia.org/wiki/2016_Egyptian_currency_crisis).
2. **Mar-2022 to Mar-2024 devaluation cycle** — three step devaluations (Mar-2022, Oct-2022, Mar-2024 ~35% overnight), CPI MoM peak 0.038 Sep-2023, EGX30 nominal +66% in 2024. [Zawya](https://www.zawya.com/en/capital-markets/equities/egypts-egx-gains-885bln-in-2024-despite-currency-devaluation-v9i7v1q0).

**Left-tail acceptance:** simulated 12-month equity real-return P15 ≤ −0.20, P05 ≤ −0.30. Gaussian marginals will fail; Student-t (df ∈ [4,8]) or two-component Gaussian mixture pass. Inflation MoM P99 ≥ 0.028. Kupiec proportion-of-failures backtest against 2016 and 2022-2024 empirical series must not reject at 5% for equity P05 or inflation P99.

---

## 4. Probability-of-goal precision

(a) **Real terms.** Computed against `goal_real` (today's EGP). Nominal future-year inputs are deflated per sampled CPI path first.

(b) **Formula.** Let `W_T^{(i)}` be scenario *i*'s terminal wealth deflated by its own CPI path: `W_T^{real,(i)} = W_T^{nominal,(i)} / ∏_{t=1..T}(1 + cpi_t^{(i)})`. Then

```
P_goal = (1 / N) · Σ_{i=1..N} 1[ W_T^{real,(i)} ≥ goal_real ]
```

Deflation **must** be per-scenario, never deterministic.

(c) **Monte Carlo SE.** `SE = sqrt(P(1−P)/N)`. At N=10,000 max SE = 0.005 (0.5 pp). Response includes `probability_of_goal_se`. QA: SE ≤ 0.005 for any run with N ≥ 10,000.

(d) **Boundaries.**
- `goal_real == 0` → `P_goal = 1.00` (short-circuit before sampling).
- `goal_real ≥ 1e12` → `P_goal = 0.00`.
- `goal_real < 0` → 422.
- No NaN, no clamping hiding zero-variance fits.

---

## 5. Attainability classification

A deterministic three-class badge drives the UX (per `ux-audit.md` §3). It is a hard function of the projection at the user's horizon T and the real goal — not a second probability calculation. Compare **real** terminal values to `goal_real`:

- `attainable`: `P15_real(T) ≥ goal_real`.
- `aspirational`: `median_real(T) ≥ goal_real` AND `P15_real(T) < goal_real`.
- `out_of_reach`: `median_real(T) < goal_real`.

API field `attainability: "attainable" | "aspirational" | "out_of_reach"` (snake_case enum — frontend renders as display text). Classes are disjoint and exhaustive given P15 ≤ median. QA: badge matches §8 expected column in every case.

---

## 6. Latency SLO

- **Warm** (`_sim_cache` populated): P95 ≤ **800 ms** at N=10,000, H ≤ 40y.
- **Cold** (first call, fit all three series): ≤ **4 s** from request receipt to response flush.
- P99 warm ≤ 1,500 ms; if exceeded, the engine degrades to N=5,000 and returns `reduced_precision: true` rather than 5xx. An advisor mid-call gets an answer, flagged, not a crash.

Harness: k6 or locust, 20 rps for 60 s after a warm-up request, recorded weekly in `backend/tests/perf/`. The cache key must include `calibration_snapshot_id`; any stale read after a recalibration is a correctness bug, not a performance win.

---

## 7. Disclosure & compliance checklist

These items answer what a MENA-advisory compliance officer asks before client release. Missing any one of them is a shippable defect, not a "nice to have". Every response and rendered report carries:

1. **Horizon stated** — "X years from today".
2. **Fees** — disclosed schedule or explicit "gross, fees not deducted".
3. **Past-performance disclaimer** — Arabic + English (FRA Decree 58/2018).
4. **Data source & timestamp** — NAV source, CPI source, `as_of` of calibration snapshot.
5. **MC SE next to P_goal** — e.g. "72% ± 0.5 pp".
6. **Real vs nominal toggle** — default real; both values audited.
7. **Calibration-snapshot ID** — immutable per run (`calibration_YYYY-MM.json`).
8. **Regime window** — e.g. "fit 2023-01 to 2026-03; 2016 shock excluded".
9. **Not a solicitation** — Arabic + English.
10. **Client acknowledgement timestamp** — captured on presentation.

---

## 8. Extreme-case validation suite

The rows below are the contract between engineer and QA: the implementation must pass every numeric band, and QA must encode them as a single pytest parametrize block (no handwritten variants). `IN` = initial investment, `MC` = monthly contribution, `H` = horizon years; §1 calibration and default `seed=42`. Goals are `goal_real` (today's EGP).

| # | Scenario | Expected P_goal | Expected badge |
|---|---|---|---|
| 1 | `goal_real = 0`, any params | 1.00 (exact) | Attainable |
| 2 | `goal_real = 1e11`, any params | ≤ 0.01 | Out of reach |
| 3 | IN=500k, MC=5k, H=10, risk=high, goal=1M | 0.55-0.85 | Attainable or Aspirational |
| 4 | IN=0, MC=0, H=30, goal=1 EGP | 0.00 | Out of reach |
| 5 | IN=1M, MC=0, H=1, risk=very_low, goal=900k (real) | ≥ 0.95 | Attainable |
| 6 | IN=100k, MC=10k, H=20, risk=moderate, goal=3M | 0.45-0.75 | Aspirational or Attainable |
| 7 | IN=50k, MC=1k, H=5, risk=high, goal=1M | < 0.05 | Out of reach |
| 8 | IN=50k, MC=1k, H=5, risk=high, goal=50k | > 0.95 | Attainable |
| 9 | IN=500k, MC=20k, H=2, risk=very_high, goal=6M | < 0.10 | Out of reach (arithmetic floor ~1M undiscounted) |
| 10 | IN=200k, MC=10k, H=15, risk=high, goal=2M | 0.40-0.80 | Aspirational or Attainable |
| 11 | Same as #3 but seed=42 run twice | Identical to 3 dp | Identical |
| 12 | Same as #3 but monthly_investment denominated in a year when CPI > 15% | P_goal within ±5 pp of #3 if deflator applied correctly | same |

Rows become the `pytest.mark.parametrize` table. Cases 11-12 are determinism and real-terms sanity.

---

## 9. Non-functional requirements

- **Determinism.** Same seed + inputs → same `P_goal` to 3 dp across OS, Python 3.11/3.12, NumPy ≥ 1.26.
- **Audit log.** Every `/api/simulate` writes: `timestamp, user_id, client_id, goal_real, horizon, risk, P_goal, SE, attainability, calibration_snapshot_id, seed`. Retention ≥ 7 years (FRA).
- **Numerical stability.** No NaN/Inf in projection, percentile, P_goal, or SE arrays. Assert at `run_advisor` boundary; NaN raises `InternalError` with inputs logged.
- **Memory.** Peak RSS ≤ 1.5 GB at N=10,000 × H=40y × 3 assets × float64.
- **Horizon cap.** `HORIZON_MONTHS` default 360, hard max 480; above → 422.
- **Reproducibility.** Release ships calibration snapshot + input CSV hashes; any `P_goal` recomputable offline for audit.
- **Failure isolation.** Fit failure on any asset → 503 with operator-visible reason; never silently reuse a cached fit.

---

## 10. Calibration refresh procedure

Iteration 2 split this out of `docs/data-sources.md` so the cadence, ownership, and approval gates are part of the spec contract, not an operational appendix. `data-sources.md` still documents the *how* (URLs, substitution tables, row-by-row provenance); this section is the *when / who / approval*.

**Cadence.** Quarterly, on the 11th-15th of the quarter-closing month (Mar / Jun / Sep / Dec), after CAPMAS publishes the prior-month headline CPI bulletin. Monthly touch-ups to the CSV extension tables (§2, §3 of `data-sources.md`) are allowed between quarters without spec review — they do not change the acceptable-range contract in §1.

**Owner.** Analyst runs the refresh. Analyst is sole author of `docs/market-spec.md` and `docs/data-sources.md`; no other role edits these without PR review from Analyst.

**Procedure.** Analyst, from a clean checkout on `main`:

1. Regenerate the three CSVs (see `docs/data-sources.md` §Refresh procedure for script entrypoints):
   - `backend/data/abc_equity_fund.csv` — rebuild the 6-name EGX30 basket via `tools/build_csvs.py` (or the documented Q3-2026 replacement when proxy upgrade lands).
   - `backend/data/ebe_money_market_fund.csv` — pull IMF IFS `M.EG.FITB_PA` via DBnomics; append `2025-06..latest` via the CBE MPC / press rate table in `data-sources.md` §2.
   - `backend/data/inflation.csv` — pull IMF IFS `M.EG.PCPI_IX`; append `2025-07..latest` via the CAPMAS / CBE / press MoM table in `data-sources.md` §3.
2. Run the ingest guardrail: `python backend/ingest.py ingest --source azimut`. This refits μ / σ on the new CSVs, checks against §1 acceptable ranges, writes a new `backend/data/calibration_<YYYY-MM>.json`, and exits non-zero if any range is violated.
3. If the guardrail passes: commit the three CSVs in one commit, the new calibration JSON in a separate commit (so `git bisect` can attribute a regression to data vs fit).
4. Recompute the empirical correlation matrix and confirm it falls inside §2 acceptable ranges. Update the observed-values columns in §1 and the empirical matrix in §2 of this file.
5. Open PR; CI runs `test_real_data_calibration_in_expected_range` and the §8 extreme-case suite.
6. Restart uvicorn (or bump `CALIBRATION_SNAPSHOT_ID` env) so the running service picks up the new snapshot per §6 cache-key rules.

**Snapshot file format (stable contract with `backend/ingest.py` and the `/api/simulate` response).** See `docs/data-sources.md` §Snapshot schema for the authoritative key list. Summary:

- Filename: `backend/data/calibration_<YYYY-MM>.json`, one per refresh, immutable once committed.
- Top-level required keys: `calibration_id`, `as_of` (ISO-8601 date, **single canonical key** — no `calibration_as_of`, no `snapshot_date`), `git_commit`, `fit_window`, `series`, `empirical_correlation`.
- `series.<asset>.mu_monthly` and `series.<asset>.sigma_monthly` are the authoritative fit outputs; the ingest CLI's older `fits.<asset>.mu` / `fits.<asset>.sigma` shape is deprecated and is written into the same `series.<asset>` node on every refresh.
- Backward-compatibility: `/api/simulate` must surface `calibration_as_of` as an API-level field that reads from snapshot `as_of` (single source of truth). API field name ≠ JSON key name by design — API naming belongs to engineering, file naming belongs to this spec.
- Schema changes to this file require a spec amendment PR and a migration note in `docs/data-sources.md`.

**Approval gate for range drift.** If a refresh lands observed μ or σ **outside** the §1 acceptable range, the ingest CLI fails and the refresh cannot ship. Widening a §1 range to accommodate new reality requires:

1. Analyst drafts a widening PR with (a) updated observed column, (b) updated range column, (c) cited defensible floor or ceiling for the new bound (published data source, not a model prediction).
2. **CEO + CTO co-sign** the PR. Both approvals are required on the GitHub PR; neither can self-approve; Analyst cannot approve.
3. Merge triggers a re-run of `test_real_data_calibration_in_expected_range` and the §8 extreme-case suite on the new ranges.

Tightening a range (ranges narrowing after a regime-change settles) follows the same gate. The guardrail exists to prevent silent parameter drift; widening it silently is the same failure mode in the other direction.

---

## Conflicts to resolve

Known contradictions between this spec and currently-shipped code. Each must be reconciled — either by fixing the code or by a written spec amendment — before the engineer merges §8's test suite. No silent behavioural deviation from this document is acceptable once published.

1. **`monthly_to_yearly` averages, doesn't compound** (`engine.py:60-65`). §4 requires geometric compounding per scenario.
2. **Nominal probability** (`service.py:94`) — `final_values` compared to raw goal. §4(a)(b) requires per-scenario CPI deflation.
3. **Independent per-asset sampling** (`engine.py:76-82`, `seed, seed+1, seed+2`). §2 requires a joint sampler; cannot pass ρ(MMF,CPI).
4. **Missing `probability_of_goal_se`** in `SimulateResponse` (`schemas.py:153-158`). Required by §4(c).
5. **Missing `attainability`** in `SimulateResponse`. Required by §5.
6. **`HORIZON_MONTHS = 1_200`** (`engine.py:16`). §9 caps at 480.
7. **No runtime fit-range guardrails.** §1 requires deploy-blocking validation of fitted μ and σ against the acceptable-range column. *(Partially resolved iteration 2: `backend/ingest.py` now enforces a `FIT_RANGES` constant, and §1 bands have been widened to contain honest real-data observations. **Engineer follow-up:** update `backend/ingest.py` `FIT_RANGES` literal to match the iteration-2 §1 table verbatim — current literal is iteration-1 and will reject honest refreshes until synced. This is the one-line code change that closes the loop between this spec and the CLI; no semantics change.)*
8. **Equity-proxy inflation beta.** §2 TODO (Q3 2026): replace 6-name basket with EGX30 TRI or 15-name sectorally-diversified basket; re-measure ρ(equity, CPI) and widen §2 upper bound if new proxy exceeds +0.25.
9. **Ingest CLI snapshot shape is transitional.** `backend/ingest.py` writes `fits.<asset>.{mu,sigma}` + flat `empirical_corr`. Canonical schema is `series.<asset>.{mu_monthly,sigma_monthly,...}` + `empirical_correlation.{order,matrix}` per `docs/data-sources.md` §Snapshot schema. Engineer to migrate the CLI writer on next touch; until then, hand-promote CLI output before committing.
