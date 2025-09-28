"""
File: backend/routes/strategy_params_route.py
Role: Expose deux routes utilitaires pour le front:
      - /strategy_params/{strategy_name} : introspection des paramètres d'une stratégie
      - /list_strategies : liste les modules de stratégie disponibles

Notes importantes:
  - Masque *args / **kwargs et les params internes (df/data) pour éviter
    qu'ils apparaissent dans l'UI (ex: le champ "kwargs" que tu as vu).
  - Ne modifie PAS la logique des stratégies ni du runner (0 régression).
  - Si d'anciens fronts envoient encore des champs legacy, les **kwargs
    dans les stratégies les absorberont silencieusement.

Depends:
  - backend/strategies/*.py (chaque module doit définir detect_<strategy>)
  - inspect.signature pour récupérer les paramètres

Side-effects: Aucun (lecture/inspection uniquement)
Security: Public (selon ton choix d’expo). Ne change pas la logique.
"""

from fastapi import APIRouter
from app.services.strategy_params_service import (
    get_strategy_params_info, list_strategies_names
)

router = APIRouter()

@router.get("/strategy_params/{strategy_name}")
def get_strategy_params(strategy_name: str):
    """
    Récupère via introspection la liste des paramètres d'une stratégie.

    Args:
        strategy_name (str): nom du module stratégie (ex: "fvg_impulsive")

    Returns:
        dict:
          {
            "strategy": "<name>",
            "params": [
              {"name": "...", "default": <val_or_None>, "required": bool, "annotation": "type|None"},
              ...
            ]
          }
        ou { "error": "<message>" } si l'import ou l'introspection échoue.

    Règles d’hygiène appliquées:
        - Ignore les params "internes" qui ne doivent JAMAIS être rendus dans l’UI:
            • df, data (DataFrame passé par le runner)
        - Ignore les paramètres variadiques:
            • *args (inspect.VAR_POSITIONAL)
            • **kwargs (inspect.VAR_KEYWORD)
          → Évite que "kwargs" apparaisse en champ à l'écran.
    """
    try:
        return get_strategy_params_info(strategy_name)
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}

@router.get("/list_strategies")
def list_strategies():
    """
    Liste les stratégies disponibles dans backend/strategies (fichiers .py).

    Returns:
        {"strategies": ["nom1", "nom2", ...]} triés alphabétiquement.

    Notes:
        - Ignore __init__.py et fichiers non .py.
    """
    return {"strategies": list_strategies_names()}
