# Marsa — Financial Planning for Wealth Advisors

Marsa is a **financial planning tool** for independent wealth advisors:
a goal-based Monte Carlo simulation engine with a React + Redux + Tailwind
advisor portal on top of a multi-user FastAPI backend. The advisor enters a
client profile, goals, and scenarios; Marsa runs 10,000-path simulations,
returns inflation-adjusted probability-of-goal and suggested adjustments,
and renders a presentable report.

Marsa is **not a robo-advisor**. We do not hold custody, touch brokerage
accounts, or execute trades. Nothing Marsa produces is an order; every
output is a plan the human advisor walks through with the client.

The simulation engine implements a goal-based Monte Carlo algorithm adapted
from academic research on portfolio planning under inflation: preprocessing,
distribution fitting, copula sampling, importance-percentile selection.

The product name (`Marsa` — Arabic مرسى, "harbor") lives in a single
constant in the frontend (`frontend/src/config.ts`) and an env-var-backed
setting in the backend (`APP_NAME`). Override either to rebrand.

## Structure

```
backend/   FastAPI + SQLAlchemy + Alembic + Monte Carlo simulation
frontend/  Vite + React + Redux Toolkit + Tailwind
```

## Quick start (Docker Compose)

1. Create a `.env` at the repo root from the template:
   ```sh
   cp .env.example .env
   # Generate a real JWT secret:
   python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(64))" >> .env
   ```
2. Bring everything up:
   ```sh
   docker compose up --build
   ```
3. Open http://localhost:8080 and register an advisor account.

The backend runs Alembic migrations on startup, so Postgres comes up clean
on first boot.

## Local development

### Backend

```sh
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env           # edit JWT_SECRET
alembic upgrade head
uvicorn app.main:app --reload
```

Runs on http://localhost:8000. OpenAPI docs at `/docs`.

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173. The Vite dev server proxies `/api/*` to
`http://localhost:8000`.

### Tests

```sh
cd backend && pytest
cd frontend && npm test
```

## API

All endpoints are under `/api`. Auth is JWT over an HttpOnly cookie
(`marsa_access` — the cookie name derives from `APP_NAME.lower() +
"_access"` so a brand swap renames it automatically);
`Authorization: Bearer <token>` is also accepted.

| Endpoint                     | Auth | Description                         |
| ---------------------------- | ---- | ----------------------------------- |
| `POST /api/auth/register`    | —    | Create advisor account              |
| `POST /api/auth/login`       | —    | Exchange credentials for a cookie   |
| `POST /api/auth/logout`      | ✓    | Clear auth cookie                   |
| `GET  /api/auth/me`          | ✓    | Current user                        |
| `GET  /api/clients`          | ✓    | List caller's clients               |
| `POST /api/clients`          | ✓    | Create a client                     |
| `GET  /api/clients/{id}`     | ✓    | Fetch a client (own only)           |
| `PATCH /api/clients/{id}`    | ✓    | Update a client (own only)          |
| `DELETE /api/clients/{id}`   | ✓    | Delete a client (own only)          |
| `POST /api/simulate`         | ✓    | Monte Carlo planning run            |
| `GET  /health`               | —    | Liveness probe                      |

## Configuration

See `backend/.env.example` for all supported settings. Key ones:

- `JWT_SECRET` — required, min 32 chars
- `DATABASE_URL` — Postgres in prod, SQLite for local dev
- `CORS_ORIGINS` — comma-separated allowlist
- `COOKIE_SECURE` — `true` when serving over HTTPS
- `RATE_LIMIT_LOGIN` / `RATE_LIMIT_DEFAULT` — per-IP slowapi rules

## Operations

- **Logs** are structured (JSON in production, pretty in dev) with a
  request ID bound to every log line.
- **Migrations** live in `backend/alembic/versions/`. Create a new one
  with `alembic revision --autogenerate -m "<msg>"`.
- **Rate limits** apply per-IP; login and register are tighter than the
  default. A reverse proxy should forward `X-Forwarded-For`.
- **Simulation data**: the real Azimut NAVs are not included. Synthetic
  CSVs with the PDF's equity μ/σ are generated on first call. Drop real
  CSVs into `backend/data/` (or the compose `sim_data` volume) to
  override.

## Security notes

- Passwords are pre-hashed with SHA-256 then bcrypt-ed (avoids bcrypt's
  72-byte limit without silently truncating).
- Auth cookies are HttpOnly + `SameSite=lax` by default; set
  `COOKIE_SECURE=true` behind HTTPS.
- CORS is a strict allowlist read from `CORS_ORIGINS`.
- No credentials are stored in the repo; `.env` is gitignored.
