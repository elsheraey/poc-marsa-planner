"""Authentication endpoints: register, login, logout, current user."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError

from ..config import get_settings
from ..deps import ACCESS_COOKIE_NAME, CurrentUser, DbSession
from ..models import User
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from ..security import create_access_token, hash_password, verify_password

log = structlog.get_logger("auth")
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        domain=settings.cookie_domain or None,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=ACCESS_COOKIE_NAME,
        domain=settings.cookie_domain or None,
        path="/",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, response: Response, db: DbSession) -> AuthResponse:
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")

    user = User(
        email=body.email.lower(),
        name=body.name,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")
    db.refresh(user)

    token, expires = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    log.info("user.registered", user_id=user.id, email=user.email)
    return AuthResponse(user=UserOut.model_validate(user), expires_at=expires)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, response: Response, db: DbSession) -> AuthResponse:
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        # Same message for unknown email and bad password — no user enumeration.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "account disabled")

    token, expires = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    log.info("user.login", user_id=user.id)
    return AuthResponse(user=UserOut.model_validate(user), expires_at=expires)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    _clear_auth_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
