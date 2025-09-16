import os
from pathlib import Path

DATA_ROOT = Path(os.getenv("DATA_ROOT", "/var/data/backtradz")).resolve()
OUTPUT_DIR   = DATA_ROOT / "output"    # CSV produits
ANALYSIS_DIR = DATA_ROOT / "analysis"  # résultats backtests
DB_DIR       = DATA_ROOT / "db"
USERS_JSON   = DB_DIR / "users.json"

def ensure_storage_dirs() -> None:
    for d in (OUTPUT_DIR, ANALYSIS_DIR, DB_DIR):
        d.mkdir(parents=True, exist_ok=True)
