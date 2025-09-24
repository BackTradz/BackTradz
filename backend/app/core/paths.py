from pathlib import Path
import os

DATA_ROOT       = Path(os.getenv("DATA_ROOT", "/var/data/backtradz")).resolve()
OUTPUT_DIR      = DATA_ROOT / "output"
OUTPUT_LIVE_DIR = DATA_ROOT / "output_live"
ANALYSIS_DIR    = DATA_ROOT / "analysis"
DB_DIR          = DATA_ROOT / "db"
USERS_JSON      = DB_DIR / "users.json"

# Coffre privé (si tu l’as ajouté)
PRIVATE_DIR     = DATA_ROOT / "private"
INVOICES_DIR    = PRIVATE_DIR / "invoices"
STRATEGIES_DIR  = PRIVATE_DIR / "strategies"

def ensure_storage_dirs():
    for d in (OUTPUT_DIR, OUTPUT_LIVE_DIR, ANALYSIS_DIR, DB_DIR, PRIVATE_DIR, INVOICES_DIR, STRATEGIES_DIR):
        d.mkdir(parents=True, exist_ok=True)
