# app/schemas/communs.py
from pydantic import BaseModel
from typing import Literal, List

class BacktradzModel(BaseModel):
    """Base commune (permissive, zéro régression)."""
    class Config:
        populate_by_name = True
        extra = "ignore"  # ignore les champs inconnus (legacy)

# Types de métriques autorisées pour le comparateur
Metric = Literal[
    "session",       # Asia / London / New York
    "day",           # Mon..Sun
    "hour",          # 00..23
    "winrate_tp1",   # global
    "winrate_tp2",   # global (si dispo)
    "trades_count",  # global
    "sl_rate"        # global
]

# Ordres d’affichage par défaut (front)
DEFAULT_SESSIONS: List[str] = ["Asia", "London", "New York"]
DEFAULT_DAYS: List[str] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DEFAULT_HOURS: List[str] = [f"{h:02d}" for h in range(24)]
