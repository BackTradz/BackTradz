# app/middlewares/robots_noindex.py
from starlette.middleware.base import BaseHTTPMiddleware

# Liste des chemins qu'on ne veut pas indexer
NOINDEX_PATHS = ("/login", "/register", "/profile", "/admin", "/pricing")

class RobotsNoIndexMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        for p in NOINDEX_PATHS:
            if request.url.path.startswith(p):
                response.headers["X-Robots-Tag"] = "noindex, nofollow"
                break
        return response
