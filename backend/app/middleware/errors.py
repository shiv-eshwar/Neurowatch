from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def _error_payload(code: str, message: str, details=None):
    return {"error": {"code": code, "message": message, "details": details}}


async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(
            code="http_error",
            message=str(exc.detail),
            details=None,
        ),
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=_error_payload(
            code="validation_error",
            message="Request validation failed.",
            details=exc.errors(),
        ),
    )


async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=_error_payload(
            code="internal_server_error",
            message="Unexpected server error.",
            details=str(exc),
        ),
    )
