"""Monte Carlo simulation endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from ..deps import CurrentUser
from ..schemas import SimulateRequest, SimulateResponse
from ..sim.advisor import UserGoal
from ..sim.service import run_advisor

router = APIRouter(prefix="/simulate", tags=["simulation"])


@router.post("", response_model=SimulateResponse)
def simulate(body: SimulateRequest, _user: CurrentUser) -> SimulateResponse:
    goal = UserGoal(
        duration_years=body.duration_years,
        initial_investment=body.initial_investment,
        monthly_investment=body.monthly_investment,
        annual_increase_pct=body.annual_increase_pct,
        importance=body.importance,
        risk_tolerance=body.risk_tolerance,
    )
    return SimulateResponse.model_validate(
        run_advisor(goal, goal_target_amount=body.goal_target_amount)
    )
