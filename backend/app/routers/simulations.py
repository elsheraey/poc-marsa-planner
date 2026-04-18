"""Persistence + inversion for Monte Carlo simulations.

This router is distinct from the compute-only `/api/simulate` router:
  * `POST/GET/DELETE /api/simulations` — advisor-scoped CRUD over saved
    what-ifs (a `SimulateRequest` + its `SimulateResponse`, optionally
    pinned to a client).
  * `POST /api/simulate/invert` — server-side root-find over
    `monthly_investment` (and, as a second pass, `duration_years`) to
    hit a target probability-of-goal. Replaces the frontend's ratio
    approximation.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, DbSession
from ..models import Client, Simulation
from ..schemas import (
    SimulateInvertRequest,
    SimulateInvertResponse,
    SimulationIn,
    SimulationListOut,
    SimulationOut,
)
from ..sim.advisor import UserGoal
from ..sim.service import run_advisor

log = structlog.get_logger("simulations")

router = APIRouter(tags=["simulations"])


# ---------- CRUD ----------


def _load_owned(db, user_id: str, simulation_id: str) -> Simulation:
    sim = db.get(Simulation, simulation_id)
    if not sim or sim.owner_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "simulation not found")
    return sim


def _assert_client_owned(db, user_id: str, client_id: str) -> None:
    client = db.get(Client, client_id)
    if not client or client.owner_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "client not found")


@router.post(
    "/simulations",
    response_model=SimulationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_simulation(
    body: SimulationIn, user: CurrentUser, db: DbSession
) -> Simulation:
    if body.client_id is not None:
        _assert_client_owned(db, user.id, body.client_id)

    request_payload = body.request.model_dump(mode="json")
    response_payload = body.response.model_dump(mode="json")

    sim = Simulation(
        owner_id=user.id,
        client_id=body.client_id,
        name=body.name,
        request_payload=request_payload,
        response_payload=response_payload,
        calibration_as_of=body.response.calibration_as_of,
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    log.info(
        "simulation.created",
        simulation_id=sim.id,
        owner_id=user.id,
        client_id=sim.client_id,
    )
    return sim


@router.get("/simulations", response_model=list[SimulationListOut])
def list_simulations(
    user: CurrentUser,
    db: DbSession,
    client_id: str | None = None,
) -> list[SimulationListOut]:
    stmt = select(Simulation).where(Simulation.owner_id == user.id)
    if client_id is not None:
        stmt = stmt.where(Simulation.client_id == client_id)
    stmt = stmt.order_by(Simulation.created_at.desc())
    rows = list(db.execute(stmt).scalars().all())
    # Lift the four scalar fields the advisor UI renders up from the blob.
    # Avoids the N+1 per-row detail fetch that ClientSummary used to do.
    return [
        SimulationListOut(
            id=sim.id,
            name=sim.name,
            client_id=sim.client_id,
            calibration_as_of=sim.calibration_as_of,
            created_at=sim.created_at,
            probability_of_goal=(sim.response_payload or {}).get("probability_of_goal"),
            probability_of_goal_se=(sim.response_payload or {}).get("probability_of_goal_se"),
            attainability=(sim.response_payload or {}).get("attainability"),
        )
        for sim in rows
    ]


@router.get("/simulations/{simulation_id}", response_model=SimulationOut)
def get_simulation(
    simulation_id: str, user: CurrentUser, db: DbSession
) -> Simulation:
    return _load_owned(db, user.id, simulation_id)


@router.delete(
    "/simulations/{simulation_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_simulation(
    simulation_id: str, user: CurrentUser, db: DbSession
) -> None:
    sim = _load_owned(db, user.id, simulation_id)
    db.delete(sim)
    db.commit()
    log.info("simulation.deleted", simulation_id=simulation_id)


# ---------- Inversion ----------

# Bisection configuration — hot-path cost is `run_advisor` calls (~25ms warm),
# so we cap iterations tightly. 20 iters × 25ms = 500ms, well under the 800ms
# SLO on a cache-warm box. Tolerances picked to stop as soon as either the
# bracket is narrow in EGP terms or the achieved probability is within 1%
# of target (whichever comes first).
_MAX_ITERATIONS = 20
_MONTHLY_UPPER_BOUND = 10_000_000.0  # 10M EGP / month — ridiculous, acts as the "unreachable" signal.
_MONTHLY_TOLERANCE = 100.0           # Stop bisecting when bracket < 100 EGP wide.
_PROB_TOLERANCE = 0.01
_HORIZON_UPPER_YEARS = 40


def _prob_at_monthly(
    body: SimulateInvertRequest, monthly: float, duration_years: int | None = None
) -> float:
    goal = UserGoal(
        duration_years=duration_years if duration_years is not None else body.duration_years,
        initial_investment=body.initial_investment,
        monthly_investment=monthly,
        annual_increase_pct=body.annual_increase_pct,
        importance=body.importance,
        risk_tolerance=body.risk_tolerance,
    )
    result = run_advisor(
        goal,
        goal_target_amount=body.goal_target_amount,
        return_in_real_terms=body.return_in_real_terms,
    )
    prob = result["probability_of_goal"]
    # With a non-zero goal_target_amount, `run_advisor` always returns a float.
    return float(prob) if prob is not None else 0.0


def _bisect_monthly(body: SimulateInvertRequest) -> tuple[float | None, float]:
    """Return `(required_monthly, achieved_probability_at_required)`.

    `required_monthly` is `None` iff even 10M EGP/month can't clear
    `target_probability`. The achieved probability is always the prob at
    whatever monthly we ended up recommending (or at the cap, if unreachable).
    """
    target = body.target_probability

    # Sanity anchors first — these also handle the degenerate cases without
    # burning bisection iterations.
    prob_lo = _prob_at_monthly(body, 0.0)
    if prob_lo >= target:
        return 0.0, prob_lo

    prob_hi = _prob_at_monthly(body, _MONTHLY_UPPER_BOUND)
    if prob_hi < target:
        return None, prob_hi

    lo, hi = 0.0, _MONTHLY_UPPER_BOUND
    mid_prob = prob_hi
    mid = hi
    for _ in range(_MAX_ITERATIONS):
        mid = 0.5 * (lo + hi)
        mid_prob = _prob_at_monthly(body, mid)
        if abs(mid_prob - target) <= _PROB_TOLERANCE:
            break
        if mid_prob < target:
            lo = mid
        else:
            hi = mid
        if (hi - lo) < _MONTHLY_TOLERANCE:
            break

    # Always report the upper-bracket value so the caller's achieved prob is
    # >= target (modulo tolerance), not just "close".
    if mid_prob < target:
        mid = hi
        mid_prob = _prob_at_monthly(body, hi)
    return round(mid, 2), round(mid_prob, 4)


def _bisect_horizon(body: SimulateInvertRequest, monthly: float) -> int | None:
    """Second pass: hold monthly fixed, find smallest integer `duration_years`
    in `[input_duration_years, 40]` that clears `target_probability`. Returns
    `None` if even 40y at the input monthly can't reach target."""
    target = body.target_probability
    lo_years = body.duration_years
    hi_years = _HORIZON_UPPER_YEARS

    if _prob_at_monthly(body, monthly, duration_years=lo_years) >= target:
        return lo_years
    if _prob_at_monthly(body, monthly, duration_years=hi_years) < target:
        return None

    # Integer bisection — at most ~6 iterations for [1, 40].
    while lo_years + 1 < hi_years:
        mid = (lo_years + hi_years) // 2
        if _prob_at_monthly(body, monthly, duration_years=mid) >= target:
            hi_years = mid
        else:
            lo_years = mid
    return hi_years


@router.post("/simulate/invert")
def simulate_invert(
    body: SimulateInvertRequest, _user: CurrentUser
) -> SimulateInvertResponse:
    required_monthly, achieved = _bisect_monthly(body)

    # `achieved_probability_at_double` is a sanity anchor surfaced to the UI:
    # what happens if the advisor over-contributes? Only meaningful when we
    # actually found a required monthly.
    double_prob: float | None = None
    if required_monthly is not None:
        if required_monthly > 0.0:
            double_prob = round(_prob_at_monthly(body, required_monthly * 2.0), 4)
        else:
            # Already clears at 0 EGP; "double" is still 0 — report current prob.
            double_prob = round(achieved, 4)

    # Horizon-extension alternative: "if the advisor keeps the current monthly
    # plan, what horizon clears the target?" Anchored to
    # `current_monthly_investment` if provided, else to the just-solved
    # `required_monthly` (so at the input_duration floor the two answers
    # coincide). If neither is meaningful (no current plan *and* unreachable
    # at the 10M cap), we can't say — return None.
    horizon: int | None = None
    anchor_monthly: float | None = body.current_monthly_investment
    if anchor_monthly is None and required_monthly is not None:
        anchor_monthly = required_monthly
    if anchor_monthly is not None:
        horizon = _bisect_horizon(body, anchor_monthly)

    return SimulateInvertResponse(
        required_monthly_investment=required_monthly,
        required_horizon_years=horizon,
        achieved_probability_at_required=achieved,
        achieved_probability_at_double=double_prob,
    )
