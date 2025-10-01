"""
paths.py
--------------------------------
Wrapper centralisé autour de dev.py
→ Permet de gérer Render + Local sans casser l’existant.
→ PATCH: override par ENV + fallback DEV vers backend/app/output si besoin.
"""

import os
from pathlib import Path

try:
    # ✅ Importer depuis dev.py si dispo
    from app.core.dev import DATA_ROOT, DB_ROOT, IS_DEV
    # --- OUTPUT_DIR (ENV prioritaire), sinon DATA_ROOT/output
    _OUTPUT_DIR_ENV = os.getenv("OUTPUT_DIR", "").strip().strip('"').strip("'")
    OUTPUT_DIR      = Path(_OUTPUT_DIR_ENV) if _OUTPUT_DIR_ENV else (DATA_ROOT / "output")
    OUTPUT_LIVE_DIR = DATA_ROOT / "output_live"
    # ✅ Permettre un override ciblé pour l’analyse en DEV (ou partout) via env ANALYSIS_DIR
    _ANALYSIS_DIR_ENV = os.getenv("ANALYSIS_DIR", "").strip().strip('"').strip("'")
    ANALYSIS_DIR    = Path(_ANALYSIS_DIR_ENV) if _ANALYSIS_DIR_ENV else (DATA_ROOT / "analysis")

    # 🔁 Fallback DEV (lecture overlay) :
    # si ANALYSIS_DIR n'existe pas OU est vide, on force backend/data/analysis
    if 'IS_DEV' in locals() and IS_DEV:
        try:
            _need_fallback = (not ANALYSIS_DIR.exists()) or (not any(ANALYSIS_DIR.iterdir()))
        except Exception:
            _need_fallback = True
        if _need_fallback:
            _BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
            _LOCAL_ANALYSIS = _BACKEND_DIR / "data" / "analysis"
            if _LOCAL_ANALYSIS.exists():
                ANALYSIS_DIR = _LOCAL_ANALYSIS
                print(f"🔧 [DEV] ANALYSIS_DIR redirigé vers {_LOCAL_ANALYSIS}")

   # --- DB_DIR (ENV prioritaire), sinon DB_ROOT
    _DB_DIR_ENV     = os.getenv("DB_DIR", "").strip().strip('"').strip("'")
    DB_DIR          = Path(_DB_DIR_ENV) if _DB_DIR_ENV else DB_ROOT
    USERS_JSON      = DB_DIR / "users.json"
    PRIVATE_DIR     = DATA_ROOT / "private"
    INVOICES_DIR    = PRIVATE_DIR / "invoices"
    STRATEGIES_DIR  = PRIVATE_DIR / "strategies"

    # 🔁 Fallback DEV: si OUTPUT_DIR n’existe pas mais que backend/app/output existe, on bascule dessus.
    if 'IS_DEV' in locals() and IS_DEV:
        if not OUTPUT_DIR.exists():
            _BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
            _LEGACY = _BACKEND_DIR / "app" / "output"
            if _LEGACY.exists():
                OUTPUT_DIR = _LEGACY


except Exception:
    # 🔒 Fallback → logique historique (Render only)
    DATA_ROOT       = Path(os.getenv("DATA_ROOT", "/var/data/backtradz")).resolve()
    _OUTPUT_DIR_ENV = os.getenv("OUTPUT_DIR", "").strip().strip('"').strip("'")
    OUTPUT_DIR      = Path(_OUTPUT_DIR_ENV) if _OUTPUT_DIR_ENV else (DATA_ROOT / "output")
    OUTPUT_LIVE_DIR = DATA_ROOT / "output_live"
    _ANALYSIS_DIR_ENV = os.getenv("ANALYSIS_DIR", "").strip().strip('"').strip("'")
    ANALYSIS_DIR    = Path(_ANALYSIS_DIR_ENV) if _ANALYSIS_DIR_ENV else (DATA_ROOT / "analysis")
    _DB_DIR_ENV     = os.getenv("DB_DIR", "").strip().strip('"').strip("'")
    DB_DIR          = Path(_DB_DIR_ENV) if _DB_DIR_ENV else (DATA_ROOT / "db")
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