"""Authentication endpoints: register, login, logout, current user."""

from __future__ import annotations

from datetime import datetime, timezone

import jwt
import structlog
from fastapi import APIRouter, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError

from ..config import get_settings
from ..deps import ACCESS_COOKIE_NAME, CurrentUser, DbSession
from ..models import RevokedToken, User
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from ..security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

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
@limiter.limit(lambda: get_settings().rate_limit_login)
def register(
    request: Request, body: RegisterRequest, response: Response, db: DbSession
) -> AuthResponse:
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
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered") from e
    db.refresh(user)

    token, expires, _ = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    log.info("user.registered", user_id=user.id, email=user.email)
    return AuthResponse(user=UserOut.model_validate(user), expires_at=expires)


@router.post("/login", response_model=AuthResponse)
@limiter.limit(lambda: get_settings().rate_limit_login)
def login(
    request: Request, body: LoginRequest, response: Response, db: DbSession
) -> AuthResponse:
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        # Same message for unknown email and bad password — no user enumeration.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "account disabled")

    token, expires, _ = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    log.info("user.login", user_id=user.id)
    return AuthResponse(user=UserOut.model_validate(user), expires_at=expires)


def _token_from_request(request: Request) -> str | None:
    """Fish a bearer/cookie token out of the request, without requiring one.

    Returns ``None`` when no token is present. Used by ``logout`` so we can
    still 204 cleanly when the client calls us without credentials (e.g.
    "sign out" tapped twice) — the client's job is to clear its own state
    regardless.
    """
    cookie = request.cookies.get(ACCESS_COOKIE_NAME)
    if cookie:
        return cookie
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        candidate = auth.split(" ", 1)[1].strip()
        if candidate:
            return candidate
    return None


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: DbSession) -> Response:
    token = _token_from_request(request)
    if token:
        try:
            payload = decode_access_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            sub = payload.get("sub")
            if jti and exp and sub:
                expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
                # Idempotent — two Sign-out clicks should not crash on PK
                # collision. We check first, then insert; on the narrow race
                # where a parallel logout beats us to it, we swallow
                # IntegrityError so the user still gets a 204.
                if db.get(RevokedToken, jti) is None:
                    db.add(
                        RevokedToken(jti=jti, user_id=sub, expires_at=expires_at)
                    )
                    try:
                        db.commit()
                    except IntegrityError:
                        db.rollback()
        except jwt.InvalidTokenError:
            # Expired or malformed token — nothing to revoke, nothing to do.
            # We still clear the cookie + return 204 so the client can reset.
            pass
    _clear_auth_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


def _revoked_tokens_cleanup(db: DbSession) -> int:
    """Prune ``revoked_tokens`` rows whose ``expires_at`` has passed.

    Not wired to a scheduler — invoke manually (e.g. from a cron job or a
    CLI command) when the table grows. The JWT is already rejected on
    expiry by ``decode_access_token``, so stale rows are dead weight rather
    than a security risk; ``returns`` the number of rows deleted.
    """
    now = datetime.now(timezone.utc)
    q = db.query(RevokedToken).filter(RevokedToken.expires_at < now)
    deleted = q.delete(synchronize_session=False)
    db.commit()
    return deleted


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
