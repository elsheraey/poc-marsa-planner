"""Shared fixtures — SQLite-backed TestClient that rebuilds the schema per-test."""

from __future__ import annotations

import os
import tempfile
from collections.abc import Generator

import pytest

os.environ.setdefault("JWT_SECRET", "test-secret-that-is-at-least-32-characters-for-testing")
os.environ.setdefault("RATE_LIMIT_LOGIN", "1000/minute")
os.environ.setdefault("RATE_LIMIT_DEFAULT", "10000/minute")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")


@pytest.fixture
def client() -> Generator:
    from fastapi.testclient import TestClient

    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.environ["DATABASE_URL"] = f"sqlite:///{path}"

    # Force re-read of settings and rebuild engine with the new DATABASE_URL.
    from app import database
    from app.config import get_settings

    get_settings.cache_clear()
    database.engine.dispose()
    database.engine = database._build_engine()
    database.SessionLocal.configure(bind=database.engine)

    from app import models  # noqa: F401

    database.Base.metadata.drop_all(database.engine)
    database.Base.metadata.create_all(database.engine)

    from app.main import create_app

    with TestClient(create_app()) as c:
        yield c

    try:
        os.remove(path)
    except FileNotFoundError:
        pass


@pytest.fixture
def authed_client(client):
    """A TestClient with a registered + logged-in user."""
    r = client.post(
        "/api/auth/register",
        json={"name": "Alice Advisor", "email": "alice@example.com", "password": "password123"},
    )
    assert r.status_code == 201, r.text
    return client


@pytest.fixture
def second_client(client):
    """A separate TestClient-instance user for isolation tests."""
    from fastapi.testclient import TestClient

    from app.main import create_app

    c2 = TestClient(create_app())
    r = c2.post(
        "/api/auth/register",
        json={"name": "Eve Evil", "email": "eve@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    return c2
