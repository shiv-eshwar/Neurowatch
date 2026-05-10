from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.init_db import init_db
from app.middleware.auth import AuthMiddleware
from app.middleware.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.middleware.rate_limit import RateLimitExceeded, SlowAPIMiddleware, limiter, rate_limit_exceeded_handler
from app.middleware.request_id import RequestIdMiddleware


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(title=settings.app_name)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    from fastapi import HTTPException
    from fastapi.exceptions import RequestValidationError

    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(AuthMiddleware)
    app.add_middleware(SlowAPIMiddleware)

    @app.on_event("startup")
    def on_startup():
        init_db()

    app.include_router(api_router, prefix=settings.api_prefix)

    dist_path = (Path(__file__).resolve().parents[2] / "dist").resolve()
    if dist_path.exists():
        app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="spa")

    return app


app = create_app()
