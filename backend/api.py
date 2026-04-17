"""FastAPI service exposing the RFA simulation to the React frontend.

Endpoints:
  POST /api/auth/login          — dummy auth (accepts any email/password)
  GET  /api/clients             — list of in-memory clients
  POST /api/clients             — create a client
  GET  /api/clients/{id}        — fetch one client
  PATCH /api/clients/{id}       — update a client
  POST /api/simulate            — run Monte Carlo + advisor for one scenario
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Literal

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from advisor import IMPORTANCE_PERCENTILES, UserGoal, advise
from preprocessing import inflation_series, preprocess_asset
from sample_data import generate as generate_sample_data
from simulation import run_simulation

DATA_DIR = Path(__file__).parent / "data"

app = FastAPI(title="Marsa RFA API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Simulation cache ----------
_sim_cache: dict[str, Any] = {}


def _ensure_data() -> None:
    if not (DATA_DIR / "abc_equity_fund.csv").exists():
        generate_sample_data()


def _get_sim() -> dict[str, Any]:
    if "sim" not in _sim_cache:
        _ensure_data()
        variable_returns = preprocess_asset(DATA_DIR / "abc_equity_fund.csv")
        fixed_returns = preprocess_asset(DATA_DIR / "ebe_money_market_fund.csv")
        inflation = inflation_series(DATA_DIR / "inflation.csv")
        _sim_cache["sim"] = run_simulation(variable_returns, fixed_returns, inflation)
    return _sim_cache["sim"]


# ---------- In-memory client store ----------
_clients: dict[str, dict[str, Any]] = {}


def _seed_clients() -> None:
    for i in range(9):
        cid = str(uuid.uuid4())
        _clients[cid] = {
            "id": cid,
            "clientId": "158601",
            "name": "Ahmed Ali Mohammed",
            "email": "ahmed.ali@gmail.com",
            "phone": "+201001234567",
            "lastModified": "2021-05-14",
            "profile": {
                "fullName": "Ahmed Ali Mohammed",
                "birthdate": "1970-09-15",
                "employmentStatus": "Employed",
                "employmentIncome": 10000,
                "riskAppetite": "high",
            },
            "goals": [],
            "scenarios": [],
        }


_seed_clients()


# ---------- Schemas ----------
class LoginIn(BaseModel):
    email: str
    password: str


class LoginOut(BaseModel):
    token: str
    user: dict[str, Any]


class ClientIn(BaseModel):
    name: str
    email: str
    phone: str | None = None
    profile: dict[str, Any] = Field(default_factory=dict)
    goals: list[dict[str, Any]] = Field(default_factory=list)
    scenarios: list[dict[str, Any]] = Field(default_factory=list)


class SimulateIn(BaseModel):
    duration_years: int = Field(ge=1, le=60)
    initial_investment: float = Field(ge=0)
    monthly_investment: float = Field(ge=0)
    annual_increase_pct: float = 0.0
    importance: Literal["worst", "essential", "medium", "best"] = "essential"
    risk_tolerance: Literal["very_low", "low", "moderate", "high", "very_high"] = "high"


class PortfolioOut(BaseModel):
    variable_pct: float
    percentiles: dict[str, float]


class SimulateOut(BaseModel):
    recommended: PortfolioOut
    candidates: list[PortfolioOut]
    projection: dict[str, list[float]]
    probability_of_goal: float


# ---------- Auth ----------
@app.post("/api/auth/login", response_model=LoginOut)
def login(body: LoginIn) -> LoginOut:
    if not body.email or not body.password:
        raise HTTPException(400, "email and password required")
    return LoginOut(
        token="demo-token",
        user={"name": "Samy Gamal", "email": body.email, "avatar": None},
    )


# ---------- Clients ----------
@app.get("/api/clients")
def list_clients() -> list[dict[str, Any]]:
    return list(_clients.values())


@app.post("/api/clients")
def create_client(body: ClientIn) -> dict[str, Any]:
    cid = str(uuid.uuid4())
    client = {
        "id": cid,
        "clientId": str(158600 + len(_clients) + 1),
        "lastModified": "2026-04-18",
        **body.model_dump(),
    }
    _clients[cid] = client
    return client


@app.get("/api/clients/{cid}")
def get_client(cid: str) -> dict[str, Any]:
    if cid not in _clients:
        raise HTTPException(404, "client not found")
    return _clients[cid]


@app.patch("/api/clients/{cid}")
def update_client(cid: str, body: ClientIn) -> dict[str, Any]:
    if cid not in _clients:
        raise HTTPException(404, "client not found")
    _clients[cid].update(body.model_dump(exclude_unset=True))
    return _clients[cid]


# ---------- Simulation ----------
@app.post("/api/simulate", response_model=SimulateOut)
def simulate(body: SimulateIn) -> SimulateOut:
    sim = _get_sim()
    goal = UserGoal(
        duration_years=body.duration_years,
        initial_investment=body.initial_investment,
        monthly_investment=body.monthly_investment,
        annual_increase_pct=body.annual_increase_pct,
        importance=body.importance,
        risk_tolerance=body.risk_tolerance,
    )
    best, all_results = advise(sim["variable_monthly"], sim["fixed_monthly"], goal)

    candidates = [
        PortfolioOut(
            variable_pct=r.variable_pct,
            percentiles={str(k): v for k, v in r.percentiles.items()},
        )
        for r in all_results
    ]
    recommended = PortfolioOut(
        variable_pct=best.variable_pct,
        percentiles={str(k): v for k, v in best.percentiles.items()},
    )

    # Per-year projection bands (P15/P50/P85) for the recommended allocation.
    months = body.duration_years * 12
    var_m = sim["variable_monthly"][:, :months]
    fix_m = sim["fixed_monthly"][:, :months]
    blended = best.variable_pct * var_m + (1 - best.variable_pct) * fix_m

    n = blended.shape[0]
    value = np.full(n, body.initial_investment)
    monthly_contrib = body.monthly_investment
    yearly_paths: list[np.ndarray] = []
    for m in range(months):
        value = value * (1.0 + blended[:, m]) + monthly_contrib
        if (m + 1) % 12 == 0:
            yearly_paths.append(value.copy())
            monthly_contrib *= 1.0 + body.annual_increase_pct
    paths = np.stack(yearly_paths, axis=1)  # (scenarios, years)

    projection = {
        "years": list(range(1, body.duration_years + 1)),
        "pessimistic": np.percentile(paths, 15, axis=0).tolist(),
        "median": np.percentile(paths, 50, axis=0).tolist(),
        "optimistic": np.percentile(paths, 85, axis=0).tolist(),
    }

    # Probability the final value clears the importance target (just the P{imp} pick).
    target = best.percentiles[IMPORTANCE_PERCENTILES[body.importance]]
    prob = float((best.final_values >= target).mean())

    return SimulateOut(
        recommended=recommended,
        candidates=candidates,
        projection=projection,
        probability_of_goal=round(prob, 4),
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "marsa-rfa", "version": "0.1.0"}
