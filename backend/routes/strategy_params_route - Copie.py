"""
File: backend/routes/strategy_params_route.py
Role: Expose deux routes utilitaires pour le front:
      - /strategy_params/{strategy_name} : introspection des paramètres d'une stratégie
      - /list_strategies : liste les modules de stratégie disponibles
Depends:
  - backend/strategies/*.py (chaque module doit définir detect_<strategy>)
  - inspect.signature pour récupérer les paramètres
Side-effects: Aucun (lecture/inspection uniquement)
Security: Public (selon ton choix d'expo). Ne change pas la logique.
"""

from fastapi import APIRouter
from inspect import signature
import importlib
import os

router = APIRouter()

@router.get("/strategy_params/{strategy_name}")
def get_strategy_params(strategy_name: str):
    """
    Récupère via introspection la liste des paramètres d'une stratégie.

    Args:
        strategy_name (str): nom du module stratégie (ex: "fvg_pullback_multi")

    Returns:
        dict:
          {
            "strategy": "<name>",
            "params": [
              {"name": "...", "default": <val_or_None>}, ...
            ]
          }
        ou { "error": "<message>" } si l'import ou l'introspection échoue.

    Notes:
        - Ignore le premier param 'data' ou 'df' si présent (DataFrame passé par le runner).
        - Les valeurs par défaut non définies sont renvoyées à None.
    """
    try:
        module_path = f"backend.strategies.{strategy_name}"
        strategy_module = importlib.import_module(module_path)
        func_name = f"detect_{strategy_name}"
        func = getattr(strategy_module, func_name)

        sig = signature(func)
        params_info = []
        for name, param in sig.parameters.items():
            if name in ("data", "df"):
                continue  # ignorer le DataFrame en premier argument
            params_info.append({
                "name": name,
                "default": param.default if param.default != param.empty else None
            })

        return {"strategy": strategy_name, "params": params_info}

    except Exception as e:
        return {"error": str(e)}

@router.get("/list_strategies")
def list_strategies():
    """
    Liste les stratégies disponibles dans backend/strategies (fichiers .py).

    Returns:
        {"strategies": ["nom1", "nom2", ...]} triés alphabétiquement.

    Notes:
        - Ignore __init__.py et fichiers non .py.
    """
    folder = "backend/strategies"
    strats = []
    for file in os.listdir(folder):
        if file.endswith(".py") and not file.startswith("__"):
            name = file.replace(".py", "")
            strats.append(name)
    return {"strategies": sorted(strats)}
