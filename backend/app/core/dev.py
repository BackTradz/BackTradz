# app/core/dev.py
# [v1.1] Centralisation DEV/RENDER (une seule source de vérité)

import os
from pathlib import Path
try:
    from dotenv import load_dotenv  # pour lire .env en local
except Exception:
    load_dotenv = None

# -- Localiser la racine du repo pour .env
_BACKEND_DIR = Path(__file__).resolve().parents[2]     # .../backend
_REPO_ROOT   = _BACKEND_DIR.parent                     # repo root (où tu as .env)
if load_dotenv:
    # On charge .env.local puis .env (sans override) si présents
    for _f in (_BACKEND_DIR / ".env.local",
               _BACKEND_DIR / ".env",
               _REPO_ROOT   / ".env.local",
               _REPO_ROOT   / ".env"):
        if _f.exists():
            load_dotenv(_f, override=False)

# ---- Mode d'exécution
ENV = os.getenv("ENV", "").strip().lower()            # "local" | "render" | "prod"
IS_DEV = (ENV == "local") or os.getenv("IS_DEV", "").lower() in {"1","true","yes","on"}

# ---- URLs front/back
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173" if IS_DEV else "https://www.backtradz.com"
)
PUBLIC_API_URL = os.getenv(
    "PUBLIC_API_URL",
    "http://127.0.0.1:8000" if IS_DEV else "https://api.backtradz.com"
)

# ---- Racines DATA/DB
# Local → ./backend/data & ./backend/database
# Render → /var/data/backtradz/{output_live, db}
ROOT_DIR = Path(__file__).resolve().parents[2]  # .../app/core -> .../backend
LOCAL_DATA = ROOT_DIR / "data"
LOCAL_DB   = ROOT_DIR / "database"

PERSIST_ROOT = Path(os.getenv("PERSIST_ROOT", "/var/data/backtradz"))
DATA_ROOT = Path(os.getenv("DATA_ROOT") or (LOCAL_DATA if IS_DEV else (PERSIST_ROOT / "output_live")))
DB_ROOT   = Path(os.getenv("DB_ROOT")   or (LOCAL_DB   if IS_DEV else (PERSIST_ROOT / "db")))

# Création auto en local (no-op en prod)
if IS_DEV:
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    DB_ROOT.mkdir(parents=True, exist_ok=True)

# ---- CORS whitelist (prod + local)
CORS_ALLOWED = [
    FRONTEND_URL,
    "https://www.backtradz.com",
    "https://backtradz.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
