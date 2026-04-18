"""FastAPI application factory."""

from __future__ import annotations

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .config import Settings, get_settings
from .errors import register_exception_handlers
from .logging import configure_logging
from .middleware import RequestContextMiddleware
from .routers import auth as auth_router
from .routers import clients as clients_router
from .routers import simulation as simulation_router
from .routers import simulations as simulations_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)
    log = structlog.get_logger("startup")

    app = FastAPI(title=f"{settings.app_name} RFA API", version="1.0.0")

    limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit_default])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    )

    register_exception_handlers(app)

    api_prefix = "/api"
    app.include_router(auth_router.router, prefix=api_prefix)
    app.include_router(clients_router.router, prefix=api_prefix)
    app.include_router(simulation_router.router, prefix=api_prefix)
    app.include_router(simulations_router.router, prefix=api_prefix)

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/", tags=["meta"])
    def root() -> dict[str, str]:
        return {"service": f"{settings.app_name.lower()}-rfa", "version": app.version}

    log.info("app.startup", env=settings.app_env, cors=settings.cors_origins)
    return app


app = create_app()
