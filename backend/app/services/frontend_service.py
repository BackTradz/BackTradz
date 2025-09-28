"""
File: backend/app/services/frontend_service.py
Role: Centralise l'init du moteur Jinja2 + base dir.
Security: public (rendu de templates seulement).
"""

from pathlib import Path
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parents[2]  # -> backend/
TEMPLATES_DIR = (BASE_DIR.parent / "frontend" / "templates")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
