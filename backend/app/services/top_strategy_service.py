"""
File: backend/app/services/top_strategy_service.py
Role: Helpers pour lecture XLSX public + résolution dossier.
"""
from pathlib import Path
from fastapi import HTTPException
from app.core.paths import ANALYSIS_DIR

BASE_ANALYSIS = ANALYSIS_DIR

def _find_xlsx_in_folder(folder: str) -> Path:
    base = BASE_ANALYSIS / folder
    if not base.exists() or not base.is_dir():
        raise HTTPException(status_code=404, detail="Folder not found")
    files = list(base.glob("*.xlsx"))
    if not files:
        raise HTTPException(status_code=404, detail="No xlsx in folder")
    return files[0]
