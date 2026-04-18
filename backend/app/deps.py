"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import RevokedToken, User
from .security import decode_access_token

# Cookie name derives from APP_NAME so a brand swap (via the APP_NAME env
# var) renames the cookie in lockstep — no second-source-of-truth drift
# between the backend label and the URL. Lowercased + suffixed for
# readability; stay ASCII since cookie names must be a token per RFC 6265.
ACCESS_COOKIE_NAME = f"{get_settings().app_name.lower()}_access"


def _extract_token(request: Request, cookie_token: str | None) -> str:
    if cookie_token:
        return cookie_token
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    access_cookie: Annotated[str | None, Cookie(alias=ACCESS_COOKIE_NAME)] = None,
) -> User:
    token = _extract_token(request, access_cookie)
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token expired") from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token") from e

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")

    # Revocation check. Tokens issued before 0003_revoked_tokens migration (or
    # from other code paths) may lack a ``jti``; those remain valid until
    # ``exp``. New tokens all carry one (see ``security.create_access_token``).
    jti = payload.get("jti")
    if jti and db.get(RevokedToken, jti) is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token revoked")

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]
