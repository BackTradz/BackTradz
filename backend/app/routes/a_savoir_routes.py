#backend/app/routes/a_savoir_routes.py
"""
File: backend/app/routes/a_savoir_routes.py
Role: Sert la page informative "À savoir".
Depends:
  - app.utils.templates.templates : moteur de templates (Jinja2/FastAPI) si utilisé
  - app.services.a_savoir_service.get_a_savoir_context : préparation du contexte
Side-effects: Aucun
Security: Page publique (pas d'auth).
"""
 

from fastapi import APIRouter, Request
from app.utils.templates import templates
from app.services.a_savoir_service import get_a_savoir_context

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
        - Si tu n'utilises plus de templates, on pourra facilement basculer en JSON
          en remplaçant le TemplateResponse par un JSONResponse (sans casser l'API).
        - Le contexte est désormais construit dans le service (pas besoin de toucher la route).
    """
    # Contexte délégué au service (extensible sans impacter la route)
    context = get_a_savoir_context(request)
    return templates.TemplateResponse("a_savoir.html", context)
