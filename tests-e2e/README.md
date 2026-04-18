# tests-e2e

Playwright end-to-end tests for Marsa RFA. Lives outside the frontend so
the heavy Playwright + browser tarballs don't get pulled into `frontend/`'s
lockfile or production bundle.

## Prerequisites

Both servers must be running:

```bash
# backend
cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# frontend (separate shell)
cd frontend && npm run dev
```

Vite is expected on `http://localhost:5173` and proxies `/api` to the FastAPI
backend on `http://127.0.0.1:8000`.

## Install

```bash
cd tests-e2e
npm install
npx playwright install chromium        # use --with-deps if you have sudo
```

## Run

```bash
# run everything
npx playwright test

# run a single file
npx playwright test tests/auth.spec.ts

# headed mode (watch the browser)
npm run test:headed

# interactive UI runner
npm run test:ui

# open the last HTML report
npx playwright show-report
```

Traces are captured on failure (`retain-on-failure`) and can be inspected via
the HTML report.

## Tests

- `auth.spec.ts` — register a fresh user (unique timestamped email), land on
  `/clients`, sign out, log back in.
- `clients.spec.ts` — walks the full Profile/Goals/Scenario wizard, runs the
  simulation, asserts the report page renders a valid probability percent,
  and re-runs with a very different goal amount to verify variance once the
  `probability_of_goal` fix is wired end-to-end.
- `validation.spec.ts` — login form validation runs purely client-side and
  never calls `/api/auth/login` for empty or malformed inputs.
