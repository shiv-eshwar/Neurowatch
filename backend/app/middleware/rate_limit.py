from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)


def rate_limit_exceeded_handler(_: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "rate_limit_exceeded",
                "message": "Too many requests. Please wait a moment and try again.",
                "details": str(exc.detail),
            }
        },
    )


__all__ = ["limiter", "RateLimitExceeded", "rate_limit_exceeded_handler", "SlowAPIMiddleware"]
