"""
File: backend/app/services/backtest_xlsx_service.py
Role: Centralise les helpers utilisés par les routes backtest_xlsx
      (contrôles d'accès, recherche xlsx, parsing dates, sessions…).
Security: Les routes restent protégées par get_current_user côté routes.
Side-effects: lecture disque .xlsx, JSON meta.
"""

from pathlib import Path
from typing import Optional, Any, Dict
from fastapi import HTTPException
import json
from datetime import datetime
from app.core.paths import ANALYSIS_DIR
from app.core.admin import is_admin_user

# -------- Helpers: résolution du dossier/xlsx + contrôle d'accès --------
def _is_admin(user) -> bool:
    try:
        return is_admin_user(user)
    except Exception:
        return False

def _analysis_base() -> Path:
    return ANALYSIS_DIR

def _folder_path(folder: str) -> Path:
    return _analysis_base() / folder

def _assert_owns_folder(folder: str, user) -> Path:
    p = _folder_path(folder)
    if not p.exists() or not p.is_dir():
        raise HTTPException(404, "Dossier introuvable")

    if _is_admin(user):
        return p

    json_files = list(p.glob("*.json"))
    if not json_files:
        raise HTTPException(400, "Métadonnées JSON absentes dans le dossier")
    try:
        with open(json_files[0], "r", encoding="utf-8") as f:
            meta = json.load(f)
    except Exception as e:
        raise HTTPException(500, f"Erreur lecture JSON: {e}")

    user_id = getattr(user, "id", None)
    if user_id is None and isinstance(user, dict):
        user_id = user.get("id")

    if meta.get("user_id") != user_id:
        raise HTTPException(403, "Accès refusé à ce backtest")
    return p

def _guess_xlsx_path(folder_dir: Path) -> Optional[Path]:
    cands = list(folder_dir.glob("analyse_*_resultats.xlsx"))
    if cands:
        return cands[0]
    any_xlsx = list(folder_dir.glob("*.xlsx"))
    return any_xlsx[0] if any_xlsx else None

def _safe_str(v) -> str:
    return "" if v is None else str(v)

def _to_dt(v) -> Optional[datetime]:
    if isinstance(v, datetime):
        return v
    s = _safe_str(v).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%d/%m/%Y %H:%M"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass
    return None

def _session_for_hour(h: int) -> str:
    if   0 <= h < 7:  return "Asia"
    elif 7 <= h < 13: return "London"
    elif 13 <= h < 21:return "NY"
    else:             return "Late"

__all__ = [
    "_is_admin","_analysis_base","_folder_path","_assert_owns_folder",
    "_guess_xlsx_path","_safe_str","_to_dt","_session_for_hour"
]
