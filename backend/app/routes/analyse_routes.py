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


from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
from app.services.analyse_service import find_analysis_file, top_strategies_file


router = APIRouter()




@router.get("/download/{filename}")
def download_xlsx(
    filename: str,
    folder: str | None = Query(None, description="(optionnel) dossier d'analyse pour désambigüer"),
):
    """
    Télécharge un .xlsx de backtest.
    - Cherche d'abord sous ANALYSIS_DIR (disque Render).
    - Fallback sous backend/data/analysis (ancien emplacement).
    - Si `?folder=` est fourni, on privilégie ce sous-dossier.
    """

    path = find_analysis_file(filename, folder)
    if not path:
        raise HTTPException(status_code=404, detail="❌ Fichier non trouvé")

    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
    json_path = top_strategies_file()
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Top strategies non trouvé")
    return FileResponse(json_path, media_type="application/json")
