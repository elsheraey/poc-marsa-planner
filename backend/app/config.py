"""Typed application configuration loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Product name. Single source of truth for every user-visible brand
    # reference on the backend: OpenAPI title, root metadata, and the auth
    # cookie prefix (see ACCESS_COOKIE_NAME in deps.py which derives from
    # this). Override via the APP_NAME env var to rebrand without code
    # changes.
    app_name: str = Field(default="Marsa", alias="APP_NAME")

    app_env: str = "development"
    log_level: str = "INFO"

    database_url: str = "sqlite:///./marsa.db"

    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str | None = None

    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    rate_limit_login: str = "10/minute"
    rate_limit_default: str = "120/minute"

    data_dir: Path = Path("./data")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
