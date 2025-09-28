"""
File: backend/app/services/analyse_service.py
Role: Logique utilitaire pour les routes d'analyse:
      - recherche robuste d'un fichier .xlsx d'analyse
      - chemin du JSON public "top_strategies"
Security: Aucune auth ici (les routes restent publiques comme avant).
Side-effects: lecture disque uniquement.
"""

from pathlib import Path
from typing import Optional
from app.core.paths import ANALYSIS_DIR

def find_analysis_file(filename: str, folder: Optional[str] = None) -> Optional[Path]:
    """
    Reproduit exactement la logique actuelle:
      1) teste {ANALYSIS_DIR}/{folder}/{filename} si `folder` fourni
      2) sinon, rglob(filename) sous ANALYSIS_DIR (premier match)
    Retourne le Path si trouvé, sinon None.
    """
    roots = [ANALYSIS_DIR.resolve()]
    candidates: list[Path] = []

    # a) si folder fourni → test direct
    if folder:
        for r in roots:
            p = (r / folder / filename).resolve()
            if p.exists() and p.is_file():
                candidates.append(p)

    # b) fallback / complément → rglob(filename) (premier match suffisant)
    if not candidates:
        for r in roots:
            for p in r.rglob(filename):
                try:
                    # garde-fou: p doit être sous r
                    if r in p.resolve().parents:
                        candidates.append(p)
                        break
                except Exception:
                    continue
            if candidates:
                break

    return candidates[0] if candidates else None

def top_strategies_file() -> Path:
    """
    Retourne le Path du JSON public des top stratégies.
    (Chemin conservé à l'identique pour 0 régression.)
    """
    return Path("backend/data/public/top_strategies.json")
