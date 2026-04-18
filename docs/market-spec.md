# Marsa RFA — Market Expectations Spec

**Author:** Quantitative Analyst (RFA team)
**Date:** 2026-04-18
**Status:** Contract. Engineer builds against this; QA tests against this. Every item is falsifiable.
**Scope:** Egypt / EGP, 2023-2026 post-float regime. Other markets require a separate spec.

Defines what "credible for the MENA market" means for the Monte Carlo engine and
`/api/simulate`. Cross-references `analyst-report.md` for underlying analysis.
Every section below is falsifiable. Ambiguities are bugs — raise an issue, do
not interpret silently.

---

## 1. Calibrated parameter ranges (Egypt, 2023-2026 regime)

All figures monthly. μ_monthly_real is the CPI-deflated arithmetic mean of monthly returns; σ_monthly is the std-dev of nominal monthly returns (real-series σ differs by < 10% and is not separately constrained). Fits are calibrated on data from 2023-01 onwards to the run date — the 2016 and 2022-2024 shocks are reached via §3 coverage, not via the fit window. The ranges in the right-hand column are hard deploy-blockers: the release pipeline refits and fails if any μ or σ lands outside the band. This is what prevents the analyst-report.md failure mode where pre-2016 EGP equity μ was baked into a production model.

| Asset | μ_monthly_real | σ_monthly | Acceptable range (μ_real, σ) | Source |
|---|---|---|---|---|
| EGX30 / ABC Equity Fund 1 | +0.004 | 0.080 | μ_real ∈ [+0.001, +0.012]; σ ∈ [0.060, 0.095] | [V-Lab EGARCH](https://vlab.stern.nyu.edu/volatility/VOL.CASE:IND-R.EGARCH); [Zeed ABC](https://zeed.tech/funds/arab-banking-corporation-abc-bank-equity-fund-abc/) |
| EBE / EGP MMF (AZ-Nasser, HSBC, NBE-MMF4) | +0.005 | 0.0018 | μ_real ∈ [+0.002, +0.008]; σ ∈ [0.0010, 0.0025] | [Thndr](https://thndr.app/blogpost/riding-egypts-rate-cycle-money-market-vs-fixed-income-funds/); [CBE](https://www.cbe.org.eg/en/monetary-policy/inflation) |
| Egypt Urban CPI (MoM) | deflator | 0.010 | μ_nominal ∈ [+0.010, +0.016]; σ ∈ [0.008, 0.014]; P99 ≥ 0.028 | [CBE Nov-2025](https://www.cbe.org.eg/-/media/project/cbe/listing/publication/2025/november/inf_nov_2025-en-final.pdf); [TradingEconomics](https://tradingeconomics.com/egypt/inflation-cpi) |

**Real-return conversion (normative):** `r_real_t = (1 + r_nominal_t) / (1 + cpi_t) − 1`, applied pointwise per month, never on aggregated series.

---

## 2. Joint distribution requirements

Independent per-asset sampling is rejected: it cannot reproduce Mar-2024, when a devaluation simultaneously drove equity rallies, MMF-yield step-ups and an inflation spike. The engine must sample (equity, MMF, inflation) jointly via a Cholesky factorization on standardized residuals after marginal fits, so chosen marginals (t / mixture) are preserved and cross-asset dependence is added. Empirical Pearson ρ on 2023-01 to 2026-03 monthly data:

|              | equity | MMF   | inflation |
|---          |---     |---    |---        |
| equity       |  1.00  | +0.10 |  +0.35    |
| MMF          | +0.10  |  1.00 |  +0.55    |
| inflation    | +0.35  | +0.55 |   1.00    |

**Acceptable ranges** (60-month rolling window):
- ρ(equity, inflation) ∈ [+0.20, +0.55] — positive; devaluation passthrough.
- ρ(MMF, inflation) ∈ [+0.35, +0.70] — **strongest pair**, positive; CBE policy response to CPI.
- ρ(equity, MMF) ∈ [−0.10, +0.30] — weakest; either sign permitted.

Sampler must preserve signs and the rank order |ρ(MMF,CPI)| > |ρ(equity,CPI)| > |ρ(equity,MMF)|. QA draws 50k samples and recomputes ρ; deviation > 0.10 from spec centre fails.

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

- `Attainable`: `P15_real(T) ≥ goal_real`.
- `Aspirational`: `median_real(T) ≥ goal_real` AND `P15_real(T) < goal_real`.
- `Out of reach`: `median_real(T) < goal_real`.

API field `attainability: "Attainable" | "Aspirational" | "Out of reach"`. Classes are disjoint and exhaustive given P15 ≤ median. QA: badge matches §8 expected column in every case.

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

## Conflicts to resolve

Known contradictions between this spec and currently-shipped code. Each must be reconciled — either by fixing the code or by a written spec amendment — before the engineer merges §8's test suite. No silent behavioural deviation from this document is acceptable once published.

1. **`monthly_to_yearly` averages, doesn't compound** (`engine.py:60-65`). §4 requires geometric compounding per scenario.
2. **Nominal probability** (`service.py:94`) — `final_values` compared to raw goal. §4(a)(b) requires per-scenario CPI deflation.
3. **Independent per-asset sampling** (`engine.py:76-82`, `seed, seed+1, seed+2`). §2 requires a joint sampler; cannot pass ρ(MMF,CPI).
4. **Missing `probability_of_goal_se`** in `SimulateResponse` (`schemas.py:153-158`). Required by §4(c).
5. **Missing `attainability`** in `SimulateResponse`. Required by §5.
6. **`HORIZON_MONTHS = 1_200`** (`engine.py:16`). §9 caps at 480.
7. **No runtime fit-range guardrails.** §1 requires deploy-blocking validation of fitted μ and σ against the acceptable-range column.
