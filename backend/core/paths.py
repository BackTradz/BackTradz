# backend/core/paths.py
from pathlib import Path, os

DATA_ROOT       = Path(os.getenv("DATA_ROOT", "/var/data/backtradz")).resolve()
OUTPUT_DIR      = DATA_ROOT / "output"         # CSV officiels (vendus)
OUTPUT_LIVE_DIR = DATA_ROOT / "output_live"    # Extractions ponctuelles
ANALYSIS_DIR    = DATA_ROOT / "analysis"       # Résultats backtests
DB_DIR          = DATA_ROOT / "db"
USERS_JSON      = DB_DIR / "users.json"
PRIVATE_DIR   = DATA_ROOT / "private"
INVOICES_DIR  = PRIVATE_DIR / "invoices"


def ensure_storage_dirs():
    for d in (OUTPUT_DIR, OUTPUT_LIVE_DIR, ANALYSIS_DIR, DB_DIR, PRIVATE_DIR, INVOICES_DIR):
        d.mkdir(parents=True, exist_ok=True)
