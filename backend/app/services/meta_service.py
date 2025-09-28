"""
File: backend/app/services/meta_service.py
Role: Façade de lecture des métadonnées pip (délègue à utils.pip_registry).
"""

from app.utils.pip_registry import get_pip

def get_pip_value(symbol: str) -> float | int | None:
    return get_pip(symbol)
