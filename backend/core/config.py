import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.backtradz.com").rstrip("/")
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "https://api.backtradz.com").rstrip("/")
