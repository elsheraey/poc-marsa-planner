# Marsa — Calibration & Algorithm Review

**Author:** Quantitative Analyst
**Date:** 2026-04-18
**Status:** Research report. No code changes included.

## Executive summary

- The PDF's equity parameters (μ=0.624%/mo → 7.7%/yr, σ=9.19%/mo → 31.8%/yr) are **severely stale**, likely pre-2016-float. ABC Bank Equity Fund 1 (Azimut Egypt) returned **+21.35% over the last 12 months** (NAV 395.50 EGP); EGX30 is up ~60% YoY. Realistic equity μ is **1.5-2.0%/mo**; σ is roughly right.
- MMF and inflation placeholders are wrong by **~2x**. CBE deposit rate is 21%; T-bills and monthly-payout certificates pay 19-25%/yr. Realistic MMF μ ≈ **1.7%/mo, σ ≈ 0.15%**. Egypt MoM CPI runs 1.0-1.4% typically with devaluation spikes to 3%+ — far more fat-tailed/skewed than the Gaussian placeholder.
- **Single most important change:** report in **real (CPI-deflated) terms** and sample the three marginals **jointly (correlated)**. In a 12-15% inflation regime, nominal terminal wealth misleads clients about purchasing power.

## Real-world parameters (Egypt, 2026)

All monthly figures. Equity/MMF are approximate geometric-to-arithmetic conversions from annualized data; use proper NAV fits once real CSVs land.

| Asset | μ (monthly) | σ (monthly) | Notes | Source |
|---|---|---|---|---|
| ABC Bank Equity Fund 1 (Azimut Egypt) | ~0.0163 (1-yr trailing) | ~0.07-0.09 (proxy = EGX30 EGARCH) | NAV 395.50 EGP; 1y +21.35%; since-inception +753.64% (Aug 2008) | [Zeed fund page](https://zeed.tech/funds/arab-banking-corporation-abc-bank-equity-fund-abc/) |
| EGX30 (benchmark proxy) | ~0.0400 (trailing 12m extraordinary) / ~0.0150 long-run | ~0.0812 (28.14% annualized, V-Lab EGARCH 1-month) | YoY +60.26% as of Apr 2026; reached ATH 52,821 in Feb 2026 | [V-Lab EGARCH](https://vlab.stern.nyu.edu/volatility/VOL.CASE:IND-R.EGARCH), [TradingEconomics](https://tradingeconomics.com/egypt/stock-market) |
| EBE / Egyptian MMF (proxy: AZ-Nasser, HSBC MMF, NBE-MMF4) | ~0.0175 | ~0.0015-0.0020 (tracks CBE policy-rate steps) | CBE deposit rate 21% after 4x cuts in 2025; T-bill primary ~25% short / ~20% long end | [Thndr blog](https://thndr.app/blogpost/riding-egypts-rate-cycle-money-market-vs-fixed-income-funds/), [CBE inflation reports](https://www.cbe.org.eg/en/monetary-policy/inflation) |
| Egypt CPI MoM (urban headline) | ~0.010-0.014 typical; spikes to 0.032 | ~0.010 (high; bimodal post-devaluation) | YoY 12.3% Dec-2025; 15.2% Mar-2026; 38% peak Sep-2023 | [CBE monthly bulletin](https://www.cbe.org.eg/-/media/project/cbe/listing/publication/2025/november/inf_nov_2025-en-final.pdf), [Daily News Egypt](https://www.dailynewsegypt.com/2026/01/10/annual-urban-inflation-in-egypt-stabilises-at-12-3-in-december-2025/) |

## Discrepancies from current model

1. **Equity μ understated ~3x.** 7.7%/yr nominal is *below* the EGP risk-free rate — implies negative equity risk premium, nonsensical. Fit window is almost certainly pre-Nov-2016 float.
2. **Equity σ is fine** (31.8%/yr vs. V-Lab EGARCH 28%). Keep, or let it float via GARCH.
3. **MMF μ off by ~2.2x** (10%/yr placeholder vs. 20-22%/yr actual). This *structurally underweights cash* in every advisor recommendation.
4. **MMF σ model is wrong shape.** Magnitude is okay but MMF yields step with CBE policy, not i.i.d. Gaussian noise.
5. **Inflation μ off 20-40%**; σ too low 2-3x. 2023-2026 MoM ranged 0.1% to >3%; the Gaussian misses the 2022/2024 devaluation regime shifts entirely.
6. **No correlation.** EGP devaluations simultaneously drive equity rallies (nominal) and bond-price losses. Independent sampling cannot reproduce Mar-2024.

## Recommended algorithm changes (ranked by impact × effort)

| # | Change | Impact | Effort | Notes |
|---|---|---|---|---|
| 1 | **Report in real (CPI-deflated) terms by default** | Very high | Low | Keep nominal as a toggle. `real_return_t = (1+nominal_t)/(1+cpi_t) - 1`. In 12-15% inflation, nominal terminal wealth is misleading. |
| 2 | **Refresh calibration on real NAV/CPI data** with a rolling 5-yr window | Very high | Medium | Requires the NAV CSVs the engineer is wiring up. Current params are wrong regardless of the distribution family. |
| 3 | **Joint sampling via Cholesky on the residuals** | High | Low-Medium | Fit a 3×3 corr matrix on standardized residuals after marginal fits; sample multivariate, then invert CDFs. Preserves KS-chosen marginals (incl. t/Laplace) and adds realistic cross-asset dependence. |
| 4 | **Add a regime/jump component to inflation** | High | Medium | A two-state Markov switch (normal ~1% vs. devaluation ~3-5%) matches 2016/2022/2024 shocks far better than Normal/t/Laplace. Or use a mixture-of-Gaussians fit. |
| 5 | **Switch equity marginal to Student-t with low df (4-6) by default** | Medium | Low | EGX has clear fat left tails (2011, 2016, 2020, 2022). KS p-value selection already prefers t in most real-data backtests; just confirm after data loads. Consider skew-t for asymmetry. |
| 6 | **Increase scenarios for tail statistics on short horizons** | Medium | Low | 10k paths gives ~1-3% relative std-error on 5th-percentile estimates. For 2-year horizons advisors care about VaR/CVaR — bump to 50-100k, or use stratified/antithetic variates. CLT does not save you at H=24. |
| 7 | **Replace `monthly_to_yearly = mean(12)` with geometric compounding** | High (bug-class) | Trivial | Current engine averages monthly returns inside each year. That is arithmetic, not the realized annual return. Use `prod(1+r)-1` over each 12-month block. The discrepancy grows with σ (Jensen gap). |
| 8 | **Cap path sampling horizon** or warn users | Low | Trivial | HORIZON_MONTHS = 1200 (100 yrs) is unusable for retail advisory; estimation error compounds and no one plans 100 years in Egypt. Default to 30-40 yrs. |

Change #7 is a latent bug worth flagging to the engineer independently — it understates dispersion and biases the mean for any asset where σ is comparable to μ (true for equity).

## Recommended data pipeline

Tiered plan, least-to-most effort:

1. **Manual quarterly upload (MVP, this week).** Pull ABC Equity and AZ-Nasser NAV history from [Zeed](https://zeed.tech/investment-manager/azimut-egypt-asset-management/) or request monthly factsheets from Azimut Egypt IR. CAPMAS/CBE publish inflation on the ~10th of each month. Drop three CSVs into `backend/data/`.
2. **Scheduled scraper (4-6 weeks).** Azimut, Mubasher, and EGX all publish EOD NAVs. GitHub Actions cron weekly appends latest row per fund; alert on NAV jump > 5 σ.
3. **Licensed feed (end state).** Refinitiv/LSEG EGX or Bloomberg (EGX30, HBEGMMI, ABCBNKF:EY) — ~$2-10k/seat/yr for SLA'd, dividend-adjusted total returns. Cross-reference with the FRA fund registry.

**Governance:** immutable raw inputs; snapshot calibration params per run (`calibration_snapshot_YYYY-MM.json`) for reproducibility; re-fit monthly; alert if 90-day μ/σ drifts > 2 σ from the 5-year baseline.

## References

- Azimut Egypt: https://azimut.eg/
- ABC Bank Equity Fund 1 (Zeed): https://zeed.tech/funds/arab-banking-corporation-abc-bank-equity-fund-abc/
- Azimut Nasser Fund AZN (Thndr): https://thndr.app/support/docs/mutual-funds-en-en-en/azimut-nasser-fund-azn/
- Thndr — Money-market vs. fixed-income rate cycle: https://thndr.app/blogpost/riding-egypts-rate-cycle-money-market-vs-fixed-income-funds/
- HSBC Egypt Money Market Fund: https://www.hsbc.com.eg/wealth/money-market-fund/
- Bloomberg ABCBNKF:EY: https://www.bloomberg.com/quote/ABCBNKF:EY
- Bloomberg HBEGMMI:EY (HSBC Egypt MMF): https://www.bloomberg.com/quote/HBEGMMI:EY
- EGX 30 official index page: https://www.egx.com.eg/en/indexdata.aspx?type=1&nav=1
- V-Lab EGARCH volatility, EGX30: https://vlab.stern.nyu.edu/volatility/VOL.CASE:IND-R.EGARCH
- TradingEconomics Egypt stock market: https://tradingeconomics.com/egypt/stock-market
- TradingEconomics Egypt CPI: https://tradingeconomics.com/egypt/inflation-cpi
- CBE Inflation portal: https://www.cbe.org.eg/en/monetary-policy/inflation
- CBE Monthly Inflation Developments (Nov 2025): https://www.cbe.org.eg/-/media/project/cbe/listing/publication/2025/november/inf_nov_2025-en-final.pdf
- CBE Monthly Inflation Developments (Apr 2025): https://www.cbe.org.eg/-/media/project/cbe/listing/publication/2025/may/inf_apr_2025_en.pdf
- Daily News Egypt — Dec 2025 inflation: https://www.dailynewsegypt.com/2026/01/10/annual-urban-inflation-in-egypt-stabilises-at-12-3-in-december-2025/
- Zawya — EGX 2024 performance: https://www.zawya.com/en/capital-markets/equities/egypts-egx-gains-885bln-in-2024-despite-currency-devaluation-v9i7v1q0
- Wikipedia — 2023-2024 Egyptian financial crisis: https://en.wikipedia.org/wiki/2023%E2%80%932024_Egyptian_financial_crisis
- CAPMAS publications: https://www.capmas.gov.eg/Pages/Publications.aspx?page_id=5107&Year=23352
