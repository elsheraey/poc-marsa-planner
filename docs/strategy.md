# Marsa Strategy Memo — April 2026

**From:** CEO
**To:** Marsa team
**Re:** Where v1 lands, and what we bet next

## 1. Where we are

V1 is a real product, not a slide deck. We have a FastAPI backend with Postgres, Alembic migrations, JWT-over-HttpOnly-cookie auth, per-IP rate limiting, structured logs, tests, and a Docker Compose deploy. The advisor portal (Vite + React + Redux + Tailwind) registers users, runs a three-step Profile/Goals/Scenario wizard, and renders the Monte Carlo output as a P15/P50/P85 fan plus a probability-of-goal number. That's shippable. What is demo-quality: the simulation is in-process (no job queue), runs on **synthetic** CSVs because Azimut NAV feeds aren't wired in, fits a single global distribution (norm/t/laplace via KS p-value) to a whole history — no regime awareness, no correlation matrix across assets, no EGP FX shock modeling. The "probability of goal" is a scalar, not a scenario-conditional one. The advisor has no CRM, no reporting export, and no Arabic UI. We have the skeleton. We do not yet have the differentiator.

## 2. The MENA wealth management frontier

The opportunity is asymmetric. Egypt has roughly **106 million people** with a young median age (~24) and a middle class that has watched the EGP lose over half its dollar value since March 2022 (CBE official rate moved from ~15.7 to ~50+ EGP/USD by early 2024 per CBE and IMF Article IV 2024). That is a forcing function: anyone with EGP savings has an urgent, real need to think about real (post-inflation, post-FX) returns — exactly what a Monte Carlo advisor answers. Meanwhile, only about **65% of Egyptian adults are banked** (World Bank Findex 2021 ~27%, up sharply post-Meeza but still low for retail investment products), and FRA-regulated mutual fund AUM is concentrated in a handful of bank-affiliated managers. The GCC is overbanked by contrast (UAE >85% banked) but under-roboed: Sarwa (~$1.5B cumulative under custody, per their 2024 press) and Thndr (~3M accounts) are brokerage-first, not advice-first. The MENA wealth-tech TAM is estimated at **$2.8-3.5B by 2027** (Strategy& / PwC MENA FinTech 2023). The gap: nobody has built a regulator-aligned, Arabic, advice-first product for the mass-affluent EGP saver who is bleeding purchasing power right now.

## 3. Competitive moat — we pick (b) Superior simulation engine

**Arabic UX (a)** is table stakes we will do anyway — it is not defensible for more than 12 months. **Advisor CRM (c)** is a crowded SaaS knife-fight against Salesforce Financial Services Cloud plus local CRMs; we lose on breadth. **D2C with AI nudges (d)** is Sarwa/Thndr's lane and requires a brokerage license we don't have. **The simulation engine is the one place where our technical DNA compounds.** Today every MENA robo fits a normal (or near-normal) distribution globally and calls it done. In an EGP context that is negligent: 2016 and 2022 devaluations are regime breaks, not tail samples, and fixed-income "risk-free" assumptions collapse when CBE hikes 800 bps overnight. A **regime-aware, FX-shock-conditional, correlation-preserving Monte Carlo** — with hidden-Markov regime detection on Egyptian inflation/FX history, and stress scenarios branded "2016 shock" / "2022 shock" — is a defensible moat because (i) it requires multi-year data wrangling nobody else has bothered with, (ii) it maps directly onto what Egyptian clients intuitively fear, and (iii) it gives advisors a story no competitor can tell. We already have the engine skeleton. We extend it.

## 4. 12-month roadmap

**Q2 2026 — Real data + regime v0.** Ingest real Azimut and top-5 Egyptian mutual fund NAVs, CBE inflation, EGP/USD daily. Ship a 2-regime HMM (calm / crisis) overlay on the current `fit_best`. Move simulation to a Celery/RQ worker so the API returns a job handle. *(Moat: simulation.)*

**Q3 2026 — Correlation + stress library.** Replace the independent variable/fixed sampling with a Cholesky-factorized joint distribution across 6-8 asset classes. Add a named "Stress Scenarios" panel: 2016 EGP float, 2022 devaluation, 2011 political shock. Arabic RTL UI shipped end of quarter. *(Moat: simulation + Arabic as hygiene.)*

**Q4 2026 — Advisor leverage + FRA compliance.** Client PDF report export (Arabic/English), suitability questionnaire aligned with FRA Decree 58/2018, audit log of every recommendation. Onboard first 5 design-partner advisory firms. *(Moat: simulation sold through advisors.)*

**Q1 2027 — Live rebalancing signals.** Monthly regime re-fit, drift alerts, what-changed narrative per client. Begin integration talks with 1-2 Egyptian custodians for straight-through execution. *(Moat: simulation becomes a recurring workflow, not a one-shot.)*

## 5. Funding / hiring

This is a **seed-stage** profile: $2.0-2.5M USD round, 18-month runway. Hires in priority order: (1) quantitative researcher with EM fixed-income experience, (2) senior full-stack engineer, (3) Arabic-native product designer, (4) compliance/FRA liaison (fractional at first), (5) advisor-side sales lead in Cairo. Target burn $110-130k/month by month 6. Series A (~$8-10M) unlocks when we show 10+ paying advisory firms and >EGP 500M in modeled AUM on platform.

## 6. The 90-day frontier bet

**Ship an LLM-powered Arabic client narrative generator that reads the simulation output (P15/P50/P85 path, allocation, regime mix) and produces a one-page MSA Arabic investment letter the advisor can send, grounded in the numbers and cross-checked against a compliance rubric.** Nobody in MENA has this. It solves the advisor's worst chore (writing client reports in Arabic), showcases our simulation's nuance (regimes get explained, not hidden), and is a 90-day build because our sim output is already structured JSON.

## 7. Risks and kill criteria

Kill the regime-engine moat if, after Q3, advisors tell us in blind interviews they can't distinguish our output from a normal-fit competitor — it means the differentiator is invisible to buyers. Kill the advisor channel if by Q4 we have <3 paying firms despite 20+ pilots. Kill Egypt-first if CBE/FRA imposes licensing costs above $250k before we hit $1M ARR. And kill the whole thesis if Sarwa or Thndr ships Arabic advice-first with regime modeling before us — at that point we pivot to a B2B simulation API rather than a full platform.
