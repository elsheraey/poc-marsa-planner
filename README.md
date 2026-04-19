# Marsa: Financial Planning for Egyptian Wealth Advisors

Marsa is a goal-based Monte Carlo planning tool for wealth advisors serving Egyptian clients. Advisors enter a client profile, goals, and scenarios. Marsa runs ten thousand inflation-adjusted simulations against real Egyptian market data (EGX30, CBE rates, CAPMAS CPI) and returns honest attainability verdicts: attainable, aspirational, or out of reach. When a goal misses, Marsa's inversion endpoint tells the advisor exactly what monthly savings or retirement-age change would close the gap.

Marsa is **not a robo-advisor**. It does not hold custody, touch brokerage accounts, or execute trades. Every output is a plan. The human advisor owns the recommendation.

## Demo

[Download the 90-second walkthrough (24 MB MP4)](demo/out/marsa-walkthrough-en.mp4)

The cut shows: login, creating a client, entering goals and scenarios, running the simulation, and reading the honest three-scenario verdict (Everything I Want / Middle Path / Pragmatic). Built with Remotion for composition, Playwright driving a live build of the app for real screen capture, and ElevenLabs for narration.

## Repo structure

```
backend/    FastAPI, SQLAlchemy, Alembic, Monte Carlo simulation engine
frontend/   Vite, React, Redux Toolkit, Tailwind, i18n (en + ar, Cairo, RTL)
demo/       Remotion video pipeline (source)
docs/       Analyst report, data-sources, calibration rationale
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

## Status

Proof of concept. The engine calibration is defensible, the advisor flow works end-to-end, i18n is in place, 78 backend tests and 9 end-to-end tests pass cleanly. It is not production-hardened: no audit logging, no FRA compliance posture, no SSO, no multi-tenancy beyond per-owner row isolation, and the data pipeline is a manual CSV drop rather than a scheduled fetch.

If you are an Egyptian wealth manager, fintech, or financial institution who could use a tool like this, take the code and build it. The goal is Egyptian advisors having better numbers, not this specific repo being the product.
