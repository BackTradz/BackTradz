"""
File: backend/routes/analyse_routes.py
Role: Gérer le téléchargement de fichiers résultats (XLSX, JSON) côté backend.
Depends:
  - backend/data/analysis/* (où sont stockés les backtests analysés)
Side-effects:
  - Lit des fichiers sur disque, renvoie via FileResponse.
Security:
  - Pas d’auth ici → ⚠️ en prod, à restreindre (X-API-Key / cookie).
"""

from backend.core.paths import ANALYSIS_DIR

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter()

@router.get("/download/{filename}")
def download_xlsx(filename: str):
    """
    Télécharge un fichier XLSX d'analyse de backtest.

    Args:
        filename (str): nom exact du fichier attendu (ex: "EURUSD_M5.xlsx").

    Returns:
        FileResponse: fichier trouvé dans backend/data/analysis/**/filename

    Raises:
        HTTPException 404: si le fichier n’existe pas.
    """
    base_path = ANALYSIS_DIR
    matches = list(base_path.rglob(filename))  # recherche récursive

    if not matches:
        raise HTTPException(status_code=404, detail="❌ Fichier non trouvé")

    return FileResponse(
        path=matches[0],
        filename=filename,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.get("/public/top_strategies")
def get_top_strategies():
    """
    Retourne le fichier JSON "top_strategies.json".

    Path attendu:
        backend/data/public/top_strategies.json

    Returns:
        FileResponse avec media_type="application/json"
    """
    json_path = Path("backend/data/public/top_strategies.json")
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Top strategies non trouvé")
    return FileResponse(json_path, media_type="application/json")
