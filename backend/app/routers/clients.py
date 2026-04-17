"""Client CRUD — scoped to the authenticated advisor."""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, DbSession
from ..models import Client
from ..schemas import ClientIn, ClientOut, ClientPatch

log = structlog.get_logger("clients")

router = APIRouter(prefix="/clients", tags=["clients"])


def _next_display_id(db, owner_id: str) -> str:
    count = db.query(Client).filter(Client.owner_id == owner_id).count()
    return str(158600 + count + 1)


def _to_dict_list(items) -> list[dict]:
    return [i.model_dump(by_alias=False) for i in items]


@router.get("", response_model=list[ClientOut])
def list_clients(user: CurrentUser, db: DbSession) -> list[Client]:
    stmt = select(Client).where(Client.owner_id == user.id).order_by(Client.updated_at.desc())
    return list(db.execute(stmt).scalars().all())


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(body: ClientIn, user: CurrentUser, db: DbSession) -> Client:
    client = Client(
        owner_id=user.id,
        display_id=_next_display_id(db, user.id),
        name=body.name,
        email=body.email.lower(),
        phone=body.phone,
        profile=body.profile,
        goals=_to_dict_list(body.goals),
        scenarios=_to_dict_list(body.scenarios),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    log.info("client.created", client_id=client.id, owner_id=user.id)
    return client


def _load_owned(db, user_id: str, client_id: str) -> Client:
    client = db.get(Client, client_id)
    if not client or client.owner_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "client not found")
    return client


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: str, user: CurrentUser, db: DbSession) -> Client:
    return _load_owned(db, user.id, client_id)


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: str, body: ClientPatch, user: CurrentUser, db: DbSession
) -> Client:
    client = _load_owned(db, user.id, client_id)
    patch = body.model_dump(exclude_unset=True)
    if "email" in patch and patch["email"]:
        patch["email"] = patch["email"].lower()
    if "goals" in patch and patch["goals"] is not None:
        patch["goals"] = _to_dict_list(body.goals or [])
    if "scenarios" in patch and patch["scenarios"] is not None:
        patch["scenarios"] = _to_dict_list(body.scenarios or [])
    for field, value in patch.items():
        setattr(client, field, value)
    client.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(client)
    log.info("client.updated", client_id=client.id)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: str, user: CurrentUser, db: DbSession) -> None:
    client = _load_owned(db, user.id, client_id)
    db.delete(client)
    db.commit()
    log.info("client.deleted", client_id=client_id)
