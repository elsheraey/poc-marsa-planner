# Marsa: Financial Planning for Egyptian Wealth Advisors

> **Note:** This is a vibe-coded proof of concept. Built in a single session with Claude Code as the pair. The engine calibration is defensible and the flows work end to end, but this is not production-hardened software. Treat it as a prompt for what the real thing could look like, not the real thing.

Marsa is a goal-based Monte Carlo planning tool for wealth advisors serving Egyptian clients. Advisors enter a client profile, goals, and scenarios. Marsa runs ten thousand inflation-adjusted simulations against real Egyptian market data (EGX30, CBE rates, CAPMAS CPI) and returns honest attainability verdicts: attainable, aspirational, or out of reach.

## Context

Most Egyptians with savings are watching their purchasing power evaporate. The pound has lost a significant share of its value against the dollar since 2022. Inflation has stayed in double digits, peaking above 30% in 2023. Yet when someone asks the only question that actually matters, *"can I afford a house, my kids' education, or retirement?"*, the answer is still usually built in Excel.

That gap inspired this tool. It was also inspired by two others:

- **[Morgan Stanley's portfolio risk platform](https://players.brightcove.net/644391012001/S1g5wv8HqW_default/index.html?videoId=6128686733001)**, which lets advisors run scenario analysis instantly and show clients the full distribution of outcomes.
- Closer to home, **[Optomatica](https://www.optomatica.com)** built something similar with **[Optofolio](https://optofolio.com)**. A company I worked with previously. Unclear whether it scaled commercially.

### Why not fully automate the advisor?

In Egypt the human layer still matters. Like real estate, where listings are online but brokers stay in the middle of most transactions. People want two things at once: transparent numbers, and someone they trust to interpret them. Marsa gives the advisor better numbers to defend. The advisor owns the conversation.

### A direct-to-consumer angle

Most Egyptians do not have access to a financial advisor. They do have savings goals. A simplified version of the same engine could let someone open their phone and answer a single question: is this actually achievable in real purchasing-power terms? Same math, lighter interface.

### Who should care

- Banks and asset managers such as **[Azimut Group](https://www.azimut-group.com)**, **[QNB Egypt](https://www.qnbalahli.com)**, **[CIB Egypt](https://www.cibeg.com)**, and **[National Bank of Egypt](https://www.nbe.com.eg)**, especially if their relationship managers still plan in Excel.
- Brokerage-first fintechs such as **[Thndr](https://www.thndr.app)**, **[Sarwa](https://www.sarwa.co)**, and other MENA players. Marsa slots in as the "should I invest, and how much?" layer above execution.
- Family offices and independent advisors serving Egyptian HNW clients.
- Any team ready to build the consumer-facing version.

## Demo

[Download the 90-second walkthrough (24 MB MP4)](demo/out/marsa-walkthrough-en.mp4)

The cut shows: login, creating a client, entering goals and scenarios, running the simulation, and reading the honest three-scenario verdict (Everything I Want, Middle Path, Pragmatic).

The walkthrough was built entirely in code:

- **[Remotion](https://www.remotion.dev)** for video composition.
- **[Playwright](https://playwright.dev)** driving a live build of the app for real screen capture.
- **[ElevenLabs](https://elevenlabs.io)** for narration. The current cut uses captions; the voiceover pipeline is wired and ready for the next render.

Every number on screen traces to a real simulation run against the live engine. Source under `demo/`.

## Repo structure

```
backend/    FastAPI, SQLAlchemy, Alembic, Monte Carlo simulation engine
frontend/   Vite, React, Redux Toolkit, Tailwind, i18n (en + ar, Cairo, RTL)
demo/       Remotion video pipeline (source)
docs/       Analyst report, data sources, calibration rationale
tests-e2e/  Playwright end-to-end suite
```

## Quick start with Docker Compose

1. Create a `.env` at the repo root:
   ```sh
   cp .env.example .env
   python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(64))" >> .env
   ```
2. Bring everything up:
   ```sh
   docker compose up --build
   ```
3. Open http://localhost:8080 and register an advisor account.

Alembic migrations run on startup, so Postgres comes up clean on first boot.

## Local development

### Backend

```sh
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env     # fill JWT_SECRET
alembic upgrade head
uvicorn app.main:app --reload
```

OpenAPI docs at http://localhost:8000/docs.

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Vite dev server on http://localhost:5173 proxies `/api/*` to the backend.

### Tests

```sh
cd backend && pytest
cd frontend && npm test
cd tests-e2e && npx playwright test
```

## API

All endpoints live under `/api`. Auth is JWT over an HttpOnly cookie. The cookie name derives from the configured `APP_NAME` so a brand swap renames it automatically. `Authorization: Bearer` headers are also accepted.

| Endpoint | Auth | Description |
| --- | --- | --- |
| `POST /api/auth/register` | no | Create advisor account |
| `POST /api/auth/login` | no | Exchange credentials for a cookie |
| `POST /api/auth/logout` | yes | Revoke the current token server-side |
| `GET /api/auth/me` | yes | Current user |
| `GET /api/clients` | yes | List caller's clients |
| `POST /api/clients` | yes | Create a client |
| `GET /api/clients/{id}` | yes | Fetch one (owner only) |
| `PATCH /api/clients/{id}` | yes | Update one (owner only) |
| `DELETE /api/clients/{id}` | yes | Delete one (owner only) |
| `POST /api/simulate` | yes | Monte Carlo planning run |
| `POST /api/simulate/invert` | yes | Solve for required monthly or horizon |
| `POST /api/simulations` | yes | Save a simulation snapshot |
| `GET /api/simulations` | yes | List saved simulations |
| `GET /api/simulations/{id}` | yes | Fetch a saved simulation |
| `DELETE /api/simulations/{id}` | yes | Delete a saved simulation |
| `GET /health` | no | Liveness probe |

## Configuration

See `backend/.env.example` for supported settings.

- `APP_NAME`: product brand, default `Marsa`. Derives the cookie name and surfaces in page titles.
- `JWT_SECRET`: required, minimum 32 characters.
- `DATABASE_URL`: Postgres in production, SQLite for local dev.
- `CORS_ORIGINS`: comma-separated allowlist.
- `COOKIE_SECURE`: set to `true` behind HTTPS.
- `RATE_LIMIT_LOGIN` / `RATE_LIMIT_DEFAULT`: per-IP slowapi rules.

## Simulation engine

The engine calibrates against real Egyptian market data in `backend/data/`:

- Equity returns from an EGX30 basket proxy.
- Fixed-income returns synthesised from CBE T-bill history.
- Inflation from CAPMAS month-on-month CPI.

Returns are fit in real (CPI-deflated) terms with ±8% winsorization so that one-off devaluation events (the 2016 float, the 2022 to 2024 staircase) do not pollute the distribution as stationary draws. Expected real CAGR for equity lands around 9 percent, defensible for the 2015 to 2026 window. See `docs/analyst-report.md` and `docs/bugs/attainability-investigation.md` for the calibration rationale.

Each `/api/simulate` response includes:

- `probability_of_goal` with Monte Carlo standard error.
- `attainability`: one of `attainable`, `aspirational`, `out_of_reach`. Based on whether the P15 and median projection bands clear the inflation-adjusted goal target.
- Full P15 / P50 / P85 projection path, year by year.
- Calibration snapshot date so the frontend can surface "calibrated as of YYYY-MM" in the disclosure panel.

## Operations

- **Logs**: structured output (JSON in production, pretty in dev) with a request ID bound to every line.
- **Migrations**: `backend/alembic/versions/`. New ones via `alembic revision --autogenerate -m "message"`.
- **Rate limits**: per-IP, tighter on `/auth/*`. A reverse proxy should forward `X-Forwarded-For`.
- **JWT revocation**: logout inserts the token's `jti` into a revoked-tokens table. Every authenticated request checks it.
- **i18n**: English and Arabic dictionaries live in `frontend/src/i18n/`. Cairo typeface via Google Fonts. The locale toggle reloads with `dir="rtl"` for Arabic.

## Security notes

- Passwords: SHA-256 pre-hash, then bcrypt. Avoids bcrypt's 72-byte input limit without silent truncation.
- Cookies: HttpOnly, `SameSite=lax` by default. Set `COOKIE_SECURE=true` behind HTTPS.
- CORS: strict allowlist read from `CORS_ORIGINS`.
- Secrets: `.env` is gitignored. No credentials in the tree.

## Not a startup

Marsa is a proof of concept built in a vibe-coding session. The engine calibration is defensible, the advisor flow works end to end, i18n is in place, and 78 backend tests plus 9 end-to-end tests pass cleanly. It is not production-hardened: no audit logging, no FRA compliance posture, no SSO, no multi-tenancy beyond per-owner row isolation, and the data pipeline is a manual CSV drop rather than a scheduled fetch.

Someone inside an Egyptian financial institution, or as a standalone fintech, should take the engine and build a production-grade product for the local market. Advisor-first, consumer-first, or both. Open an issue or reach out.

If something like this already exists in MENA and I have not found it, please tell me. That team deserves more visibility than they currently have.

***

PS: marsa.com was already taken. Turns out MarkUpgrade got there first. Feels like every good name was registered sometime around 2003.
