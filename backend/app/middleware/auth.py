from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.services.auth_provider import get_auth_provider

AUTH_COOKIE_NAME = "neurowatch_auth"


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = request.cookies.get(AUTH_COOKIE_NAME)
        request.state.auth_user = None

        if token:
            request.state.auth_user = get_auth_provider().verify_token(token)

        return await call_next(request)
