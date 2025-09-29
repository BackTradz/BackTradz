# app/middlewares/cache_favicon.py
from starlette.middleware.base import BaseHTTPMiddleware

FAVICONS = {"/favicon.ico", "/favicon-16x16.png", "/favicon-32x32.png", "/favicon-v3.png"}

class FaviconCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path in FAVICONS:
            response.headers["Cache-Control"] = "public, max-age=3600, must-revalidate"
        return response
