"""
File: backend/routes/official_data_routes.py
Role: Fournit la liste et le téléchargement des CSV officiels.
Depends:
  - backend/data/official/*.csv
  - backend.auth.get_current_user (auth obligatoire pour download)
  - backend.models.users.decrement_credits (consomme un crédit)
Side-effects:
  - Décrémente crédits utilisateur lors du download.
Security:
  - list_official_csvs → public
  - download_file → nécessite X-API-Key valide
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from backend.auth import get_current_user
from backend.models.users import decrement_credits, User
from pathlib import Path
import os

router = APIRouter()

@router.get("/official_csvs")
def list_official_csvs():
    """
    Liste les fichiers CSV officiels.

    Retour:
        { "files": [ { filename, size_kb, path }, ... ] }
    """
    folder = Path(__file__).resolve().parent.parent.parent / "backend" / "data" / "official"
    csv_files = []

    if not folder.exists():
        return {"files": []}

    for filename in os.listdir(folder):
        if filename.endswith(".csv"):
            filepath = folder / filename
            size_kb = round(filepath.stat().st_size / 1024, 2)

            csv_files.append({
                "filename": filename,
                "size_kb": size_kb,
                "path": str(filepath)
            })

    return {"files": csv_files}

@router.get("/download/{filename}")
async def download_file(filename: str, user: User = Depends(get_current_user)):
    """
    Télécharge un fichier CSV officiel.

    Args:
        filename (str): nom du fichier.
        user (User): injecté via Depends(get_current_user).

    Effets:
        - décrémente crédits du user avant de renvoyer le fichier.
    """
    folder = Path(__file__).resolve().parent.parent.parent / "backend" / "data" / "official"
    file_path = folder / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

    decrement_credits(user.id)
    return FileResponse(path=file_path, filename=filename, media_type="text/csv")
