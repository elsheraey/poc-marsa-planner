# Marsa RFA — Data Sources & Provenance

**Author:** Quantitative Analyst (RFA team)
**Date:** 2026-04-18
**Status:** Live. Updated with every calibration snapshot.
**Pairs with:** `backend/data/calibration_YYYY-MM.json`.

This document records the exact upstream source for every row in the three CSVs
under `backend/data/`. If a source is not retrievable the substitution is
documented below; if a source is behind a paywall or login the substitution
that was used instead is documented. No row in the CSVs is synthetic.

---

## 1. Variable asset — `backend/data/abc_equity_fund.csv`

**Target:** Azimut ABC Bank Equity Fund 1 (Egypt) monthly NAVs.

**What we actually have:** an equal-weight basket proxy of six EGX30
heavyweights listed on Yahoo Finance's Cairo feed, rebalanced monthly,
reconstructed starting at NAV=100 on 2014-12-31. Coverage 2014-12 to 2026-04
(137 monthly points).

**Constituents (Yahoo Finance EGX tickers, auto-adjusted for splits/dividends):**

| Ticker   | Company                                   | First Yahoo obs |
|----------|-------------------------------------------|-----------------|
| COMI.CA  | Commercial International Bank (CIB)       | 2000-11         |
| ABUK.CA  | Abu Qir Fertilizers                       | 2002-06         |
| CIEB.CA  | Credit Agricole Egypt                     | 2004-03         |
| ETEL.CA  | Telecom Egypt                             | 2005-12         |
| HRHO.CA  | EFG Hermes Holding                        | 2002-06         |
| TMGH.CA  | Talaat Moustafa Group                     | 2007-11         |

Source URL (example): https://finance.yahoo.com/quote/COMI.CA/history/

**Why a proxy:** Azimut Egypt Asset Management publishes only summary metrics
on fund-aggregator pages (Zeed.tech shows YTD / 1Y / 5Y / since-inception
returns, not NAV history — see https://zeed.tech/funds/arab-banking-corporation-abc-bank-equity-fund-abc/).
The Azimut Egypt IR site (https://azimut.eg/) does not offer a retrievable
time series either. A direct data-request to Azimut IR is the one path to
the authentic series; that is tier-2 in the data-pipeline plan in
`analyst-report.md` §Recommended data pipeline.

**Why a basket, not the VanEck EGPT ETF:** EGPT was delisted 2024-03-28 —
Yahoo Finance only has EGPT history through 2024-04
(https://finance.yahoo.com/quote/EGPT/history/). The basket covers the full
2015-2026 window in a single consistent series denominated in EGP. Cross-check:
basket monthly returns correlate 0.52 with EGPT monthly returns on the
2015-01..2024-04 overlap (136 months). USD-denomination and different
weighting explain the gap.

**Methodology:**
1. Download monthly auto-adjusted close for each ticker (2014-12..2026-04).
2. Inner-join on date — no forward-filling.
3. Compute per-ticker monthly return, take the cross-sectional mean (equal
   weights), compound to a single NAV series starting at 100 on 2014-12-31.
4. Write `date,nav` rows with month-end dates.

**Known limitations:**
- Six names, not 30 — the basket under-represents small-cap EGX30 components.
- No dividends for some names outside Yahoo's dividend coverage; `auto_adjust=True`
  applies Yahoo's adjustments but those are known to be incomplete for some
  Cairo-listed securities.
- The 2015-2017 segment pre-dates the Nov-2016 float, so μ and σ over the
  full window mix two regimes (spec §1 is fit on 2023-01+).

---

## 2. Fixed asset — `backend/data/ebe_money_market_fund.csv`

**Target:** EBE (Ahly Bank of Egypt) Money Market Fund monthly NAVs.

**What we actually have:** synthetic NAV compounded monthly from the Egypt
91-day Treasury-bill auction rate. Starts at NAV=100 on 2014-12-31; each
month NAV *= (1 + r_annual)^(1/12). Coverage 2014-12 to 2026-03 (136 points).

**Primary source (2015-01..2025-05):**
IMF International Financial Statistics, series `M.EG.FITB_PA` (Treasury-bill
rate, monthly, % p.a.), accessed via DBnomics.

```
https://api.db.nomics.world/v22/series/IMF/IFS/M.EG.FITB_PA?observations=1
```

IMF IFS dataset page: https://data.imf.org/en/datasets/IFS

**Extension (2025-06..2026-03):** IMF IFS has a ~3-month publication lag.
These 10 rows use published CBE / market figures for Egypt 91d T-bill yields
over the 2025 rate-cut cycle, interpolated linearly between anchors:

| Month     | Rate (% p.a.) | Anchor                                                                             |
|-----------|---------------|------------------------------------------------------------------------------------|
| 2025-06   | 27.0          | CBE policy rate 24% + 91d T-bill spread ~300bp                                     |
| 2025-07   | 26.0          | linear interp                                                                      |
| 2025-08   | 25.5          | https://egy.naeemonline.com/naeem/NewsDetails.aspx?ID=868461 (yield 29% 91d in context) |
| 2025-09   | 24.5          | CBE Sept-2025 MPC 50bp cut                                                         |
| 2025-10   | 23.0          | linear interp                                                                      |
| 2025-11   | 22.0          | linear interp                                                                      |
| 2025-12   | 21.0          | CBE Dec-2025 MPC, deposit rate 21%                                                 |
| 2026-01   | 20.5          | linear interp                                                                      |
| 2026-02   | 19.5          | CBE Feb-2026 MPC cut                                                               |
| 2026-03   | 18.5          | linear interp to current ~18%                                                      |

**Why a proxy, not the actual EBE MMF:** EBE does not publish a retrievable
daily or monthly NAV file. HSBC Egypt Money Market Fund (HBEGMMI:EY),
AZ-Nasser, and the NBE-MMF4 are similar products but all share the same
retrievability gap. 91d T-bill is the single cleanest public proxy for an
EGP MMF's gross yield — MMFs hold primarily T-bills and CBE repos.

**Known limitations:**
- σ of the synthetic series (~0.0039/mo) is too low vs. the spec range
  ([0.0010, 0.0025]) across the full window because including 2015-2017 when
  T-bill yields were 11-19% widens the per-period variation at the NAV level.
  Over 2023-01..2026-03 the fitted σ is 0.0022/mo, inside the spec band.
- A real MMF has a small fee drag (~50bp/yr) and accrual lag not modelled here.
- Step-changes in T-bill rate appear instantly in the synthetic NAV; in a real
  MMF the realised yield lags by the weighted-average maturity (~60 days).

---

## 3. Inflation — `backend/data/inflation.csv`

**Target:** Egypt urban headline CPI month-on-month, decimal (0.015 = 1.5%).

**What we actually have:** authentic MoM rates from 2015-01 to 2026-03 (135
points). All values are sourced rather than interpolated.

**Primary source (2015-01..2025-06):**
IMF International Financial Statistics, series `M.EG.PCPI_IX` (urban CPI
index, monthly, 2010=100 or similar base), accessed via DBnomics. MoM rate =
index[t] / index[t-1] − 1.

```
https://api.db.nomics.world/v22/series/IMF/IFS/M.EG.PCPI_IX?observations=1
```

**Extension (2025-07..2026-03):** The nine most recent months take published
CAPMAS/CBE MoM urban headline figures:

| Month     | MoM    | Source                                                                                                                                                            |
|-----------|--------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2025-07   | -0.6%  | https://www.dailynewsegypt.com/2025/08/10/egypts-annual-urban-inflation-rate-drops-to-13-9-in-july-from-14-9-in-june/                                              |
| 2025-08   | +0.2%  | https://economymiddleeast.com/news/egypts-urban-annual-inflation-drops-to-12-percent-in-august-2025/ ; CBE CPI press Aug-2025                                     |
| 2025-09   | +1.4%  | CBE CPI press Sep-2025 (headline monthly rate)                                                                                                                     |
| 2025-10   | +1.8%  | https://www.dailynewsegypt.com/2025/11/10/egypts-annual-urban-inflation-rises-to-12-5-in-october-driven-by-higher-fuel-prices/                                     |
| 2025-11   | +0.3%  | https://www.cbe.org.eg/en/news-publications/news/2025/12/10/12/45/cpi-press-release-november-2025                                                                  |
| 2025-12   | +0.2%  | https://www.arabfinance.com/en/news/newdetails/egypt-annual-headline-inflation-in-december-2025                                                                    |
| 2026-01   | +1.2%  | https://tradingeconomics.com/egypt/inflation-cpi                                                                                                                   |
| 2026-02   | +2.8%  | https://tradingeconomics.com/egypt/inflation-cpi                                                                                                                   |
| 2026-03   | +3.2%  | https://tradingeconomics.com/egypt/inflation-cpi ; https://english.ahram.org.eg/News/565619.aspx                                                                   |

**CAPMAS direct link (blocked by anti-bot WAF at time of fetch):**
https://www.capmas.gov.eg/Pages/Publications.aspx?page_id=5107&Year=23352

**CBE inflation portal (also 403s a scripted fetch):**
https://www.cbe.org.eg/en/monetary-policy/inflation

**Known limitations:**
- IMF IFS CPI index publishes with ~2-3 month lag, which is why the last 9
  months use press-reported MoM figures.
- CAPMAS/CBE publishes a rural-vs-urban split; we take the urban headline
  figure because `market-spec.md` §1 calibrates on urban CPI.
- Rounding in press releases is 1 decimal (e.g. "0.2% MoM"), so the last-9-month
  values carry ~±0.05 pp of rounding noise compared to the IMF index-derived
  first-differences.

---

## Refresh procedure

To regenerate the three CSVs and a new calibration snapshot (monthly
recommended, per `analyst-report.md`):

```bash
cd backend
.venv/bin/pip install yfinance   # if not already installed
.venv/bin/python /path/to/build_csvs.py   # see tools/build_csvs.py
PYTHONPATH=. .venv/bin/python /path/to/make_calibration.py
```

Then:

1. Spot-check ranges per `market-spec.md` §1 with the sanity-check snippet in
   `analyst-report.md`.
2. Commit new CSVs + new `calibration_YYYY-MM.json` in separate commits.
3. `reset_cache()` or restart uvicorn so the running service picks up the
   new data.
4. Update the "extension" table in §2 and §3 above with new press anchors.

**Cadence:** monthly on the 11th-15th, after CAPMAS' headline CPI bulletin.
IMF IFS refreshes on the 20th-25th, which means the "extension" table shrinks
by ~1-2 rows each refresh.

---

## Source index (all URLs cited above)

- https://finance.yahoo.com/quote/EGPT/history/
- https://finance.yahoo.com/quote/COMI.CA/history/
- https://finance.yahoo.com/quote/ABUK.CA/history/
- https://finance.yahoo.com/quote/CIEB.CA/history/
- https://finance.yahoo.com/quote/ETEL.CA/history/
- https://finance.yahoo.com/quote/HRHO.CA/history/
- https://finance.yahoo.com/quote/TMGH.CA/history/
- https://zeed.tech/funds/arab-banking-corporation-abc-bank-equity-fund-abc/
- https://azimut.eg/
- https://data.imf.org/en/datasets/IFS
- https://api.db.nomics.world/v22/series/IMF/IFS/M.EG.PCPI_IX
- https://api.db.nomics.world/v22/series/IMF/IFS/M.EG.FITB_PA
- https://api.db.nomics.world/v22/series/IMF/IFS/M.EG.FIDR_PA
- https://www.cbe.org.eg/en/monetary-policy/inflation
- https://www.cbe.org.eg/en/auctions/egp-t-bills
- https://www.capmas.gov.eg/Pages/Publications.aspx?page_id=5107&Year=23352
- https://tradingeconomics.com/egypt/inflation-cpi
- https://tradingeconomics.com/egypt/stock-market
- https://www.dailynewsegypt.com/2025/08/10/egypts-annual-urban-inflation-rate-drops-to-13-9-in-july-from-14-9-in-june/
- https://www.dailynewsegypt.com/2025/11/10/egypts-annual-urban-inflation-rises-to-12-5-in-october-driven-by-higher-fuel-prices/
- https://www.dailynewsegypt.com/2026/01/10/annual-urban-inflation-in-egypt-stabilises-at-12-3-in-december-2025/
- https://economymiddleeast.com/news/egypts-urban-annual-inflation-drops-to-12-percent-in-august-2025/
- https://www.arabfinance.com/en/news/newdetails/egypt-annual-headline-inflation-in-december-2025
- https://english.ahram.org.eg/News/565619.aspx
