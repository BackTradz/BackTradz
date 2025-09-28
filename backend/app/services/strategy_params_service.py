"""
File: backend/app/services/strategy_params_service.py
Role: Helpers pour introspection des stratégies.
"""

import inspect
import importlib
import os

def get_strategy_params_info(strategy_name: str):
    module_path = f"app.strategies.{strategy_name}"
    strategy_module = importlib.import_module(module_path)
    func = getattr(strategy_module, f"detect_{strategy_name}")
    sig = inspect.signature(func)
    params_info = []
    for name, p in sig.parameters.items():
        if p.kind in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
            continue
        if name in ("df","data","dataframe"):
            continue
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

def list_strategies_names():
    folder = "app/strategies"
    return sorted([f[:-3] for f in os.listdir(folder) if f.endswith(".py") and not f.startswith("__")])
