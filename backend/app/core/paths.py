"""
paths.py
--------------------------------
Wrapper centralisé autour de dev.py
→ Permet de gérer Render + Local sans casser l’existant.
"""
import os
from pathlib import Path

try:
    # ✅ Importer depuis dev.py si dispo
    from app.core.dev import DATA_ROOT, DB_ROOT
    # Compatibilité avec les anciens noms utilisés ailleurs
    OUTPUT_DIR      = DATA_ROOT / "output"
    OUTPUT_LIVE_DIR = DATA_ROOT / "output_live"
    # ✅ Permettre un override ciblé pour l’analyse en DEV (ou partout) via env ANALYSIS_DIR
    _ANALYSIS_DIR_ENV = os.getenv("ANALYSIS_DIR", "").strip().strip('"').strip("'")
    ANALYSIS_DIR    = Path(_ANALYSIS_DIR_ENV) if _ANALYSIS_DIR_ENV else (DATA_ROOT / "analysis")
    DB_DIR          = DB_ROOT
    USERS_JSON      = DB_DIR / "users.json"
    PRIVATE_DIR     = DATA_ROOT / "private"
    INVOICES_DIR    = PRIVATE_DIR / "invoices"
    STRATEGIES_DIR  = PRIVATE_DIR / "strategies"
except Exception:
    # 🔒 Fallback → logique historique (Render only)
    DATA_ROOT       = Path(os.getenv("DATA_ROOT", "/var/data/backtradz")).resolve()
    OUTPUT_DIR      = DATA_ROOT / "output"
    OUTPUT_LIVE_DIR = DATA_ROOT / "output_live"
    _ANALYSIS_DIR_ENV = os.getenv("ANALYSIS_DIR", "").strip().strip('"').strip("'")
    ANALYSIS_DIR    = Path(_ANALYSIS_DIR_ENV) if _ANALYSIS_DIR_ENV else (DATA_ROOT / "analysis")
    DB_DIR          = DATA_ROOT / "db"
    USERS_JSON      = DB_DIR / "users.json"
    PRIVATE_DIR     = DATA_ROOT / "private"
    INVOICES_DIR    = PRIVATE_DIR / "invoices"
    STRATEGIES_DIR  = PRIVATE_DIR / "strategies"


def ensure_storage_dirs():
    """Crée tous les dossiers requis (safe en local, no-op en prod)."""
    for d in (OUTPUT_DIR, OUTPUT_LIVE_DIR, ANALYSIS_DIR, DB_DIR, PRIVATE_DIR, INVOICES_DIR, STRATEGIES_DIR):
        try:
            d.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass