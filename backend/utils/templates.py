# backend/utils/templates.py
# --------------------------
# Raccourci centralisé pour configurer Jinja2Templates.
# Utilisé par les routes qui servent des pages HTML (frontend/templates/*).

from pathlib import Path
from fastapi.templating import Jinja2Templates

# BASE_DIR = dossier backend/
BASE_DIR = Path(__file__).resolve().parent.parent
# Chemin absolu vers le dossier des templates HTML
TEMPLATE_DIR = BASE_DIR.parent / "frontend" / "templates"

# Instance Jinja2 prête à l'emploi
templates = Jinja2Templates(directory=str(TEMPLATE_DIR))
