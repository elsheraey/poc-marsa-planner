"""Persistence for Monte Carlo simulation runs.

Distinct from the compute-only `/api/simulate` router: this one owns
advisor-scoped CRUD over saved what-ifs (a `SimulateRequest` + its
`SimulateResponse`, optionally pinned to a client).
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, DbSession
from ..models import Client, Simulation
from ..schemas import SimulationIn, SimulationListOut, SimulationOut

log = structlog.get_logger("simulations")

router = APIRouter(tags=["simulations"])


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
) -> list[Simulation]:
    stmt = select(Simulation).where(Simulation.owner_id == user.id)
    if client_id is not None:
        stmt = stmt.where(Simulation.client_id == client_id)
    stmt = stmt.order_by(Simulation.created_at.desc())
    return list(db.execute(stmt).scalars().all())


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
