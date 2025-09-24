"""
File: backend/routes/a_savoir_routes.py
Role: Sert la page informative "À savoir" côté frontend.
Depends:
  - backend.utils.templates.templates : moteur de templates (Jinja2/FastAPI)
Side-effects: Aucun (rendu template seulement)
Security: Page publique (pas d'auth).
"""

from fastapi import APIRouter, Request
from app.utils.templates import templates

router = APIRouter()

@router.get("/a-savoir")
def a_savoir_page(request: Request):
    """
    Rendu de la page "À savoir".

    Args:
        request (Request): Contexte FastAPI requis par TemplateResponse.

    Returns:
        TemplateResponse: rendu du template 'a_savoir.html' avec le contexte minimal.

    Notes:
        - Le template doit exister dans ton dossier templates (ex: templates/a_savoir.html).
        - Ajoute ici d’autres variables de contexte si tu veux afficher des infos dynamiques.
    """
    # On passe toujours {"request": request} pour Jinja2 via FastAPI
    return templates.TemplateResponse("a_savoir.html", {"request": request})
