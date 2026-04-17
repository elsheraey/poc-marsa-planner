# Marsa RFA

Implementation of the **Robotic Financial Advisor Simulation** from
`Marsa_RFA_Simulation_Overview.pdf`, with a React + Redux + Tailwind
advisor portal matching the Figma design.

## Structure

```
backend/   FastAPI service wrapping the Monte Carlo simulation
frontend/  Vite + React + Redux Toolkit + Tailwind portal
```

## Backend

The simulation engine (Parts 1–3 from the PDF) lives in
`preprocessing.py`, `simulation.py`, `advisor.py`. `api.py` exposes it
over HTTP:

- `POST /api/auth/login` — demo login (accepts any credentials)
- `GET/POST /api/clients`, `GET/PATCH /api/clients/{id}`
- `POST /api/simulate` — runs the advisor against a scenario and
  returns the recommended allocation, candidate allocations,
  year-by-year percentile bands, and probability of goal

Real Azimut NAV data is not included; `sample_data.py` writes synthetic
CSVs with the equity μ/σ from the PDF. Drop real CSVs into
`backend/data/` to replace them.

### Run

```
cd backend
pip install -r requirements.txt
uvicorn api:app --reload
```

## Frontend

Advisor-facing portal with the screens from the Figma design:

- Landing → Login
- Clients list (sidebar + table + search + pagination)
- New Client wizard: Profile → Goals → Scenario Builder
- Simulation Report (donut probabilities, stacked area chart or table)
- Client Summary

Redux slices: `auth`, `clients`, `simulation`, `draft` (in-flight
wizard state). The Vite dev server proxies `/api/*` to the backend on
port 8000.

### Run

```
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. Start the backend in another terminal
(`uvicorn api:app`) so the Vite proxy can reach it.
