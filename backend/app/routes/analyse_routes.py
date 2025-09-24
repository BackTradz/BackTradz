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


from app.core.paths import ANALYSIS_DIR
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path


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
    # 1) candidats par ordre de priorité
    roots = [
        ANALYSIS_DIR.resolve(),
        (Path("backend") / "data" / "analysis").resolve(),
    ]

    candidates: list[Path] = []

    # a) si folder fourni → on teste directement {root}/{folder}/{filename}
    if folder:
        for r in roots:
            p = (r / folder / filename).resolve()
            if p.exists() and p.is_file():
                candidates.append(p)

    # b) sinon / en complément → rglob(filename) (premier match suffisant)
    if not candidates:
        for r in roots:
            # on limite la profondeur à 3 niveaux pour rester perfs/secure
            for p in r.rglob(filename):
                try:
                    # petit garde-fou : s'assurer que p est bien sous r
                    if r in p.resolve().parents:
                        candidates.append(p)
                        break
                except Exception:
                    continue
            if candidates:
                break

    if not candidates:
        raise HTTPException(status_code=404, detail="❌ Fichier non trouvé")

    path = candidates[0]
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
    json_path = Path("backend/data/public/top_strategies.json")
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Top strategies non trouvé")
    return FileResponse(json_path, media_type="application/json")
