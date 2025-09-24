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
import inspect
import importlib
import os

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
        module_path = f"backend.strategies.{strategy_name}"
        strategy_module = importlib.import_module(module_path)

        func_name = f"detect_{strategy_name}"
        func = getattr(strategy_module, func_name)

        sig = inspect.signature(func)

        params_info = []
        for name, p in sig.parameters.items():
            # 1) Masquer les paramètres variadiques (*args / **kwargs)
            if p.kind in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
                continue

            # 2) Masquer les paramètres internes du runner (non exposés au front)
            if name in ("df", "data", "dataframe"):
                continue

            # 3) Préparer la sortie "propre" pour le front
            default = None if p.default is inspect._empty else p.default
            required = p.default is inspect._empty
            annotation = None if p.annotation is inspect._empty else str(p.annotation)

            params_info.append({
                "name": name,
                "default": default,
                "required": required,
                "annotation": annotation,
            })

        return {"strategy": strategy_name, "params": params_info}

    except Exception as e:
        # On remonte l’erreur sous forme texte pour debug front, sans crash API
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
    folder = "backend/strategies"
    strats = []
    for file in os.listdir(folder):
        if file.endswith(".py") and not file.startswith("__"):
            strats.append(file[:-3])  # remove ".py"
    return {"strategies": sorted(strats)}
