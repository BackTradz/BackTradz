"""
File: backend/app/services/user_dashboard_service.py
Role: Helpers pour suppression CSV côté dashboard (normalisation chemin).
"""
from pathlib import Path
from fastapi import HTTPException
from app.core.paths import DATA_ROOT

def _normalize_backend_rel(p: str) -> str:
    x = (p or "").replace("\\", "/").strip()
    return x

def _delete_csv_file(rel_after_backend: str, user):
    target = Path(rel_after_backend)
    if not target.is_absolute():
        target = (DATA_ROOT / rel_after_backend).resolve()
    if DATA_ROOT not in target.parents and target != DATA_ROOT:
        raise HTTPException(status_code=400, detail="Chemin invalide")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="CSV introuvable")
    try:
        target.unlink()
        print(f"🗑️ CSV supprimé : {target}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur suppression: {e}")
