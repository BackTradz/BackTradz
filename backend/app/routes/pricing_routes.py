"""
File: backend/routes/pricing_routes.py
Role: Rendre la page 'pricing' et injecter les offres (OFFERS) + état utilisateur.
Depends:
  - backend.utils.templates.templates (Jinja2)
  - backend.utils.offers.OFFERS (catalogue d'offres)
  - backend.auth.get_current_user_optional (retourne user ou None via cookie 'token')
Side-effects: Aucun (rendu de template uniquement)
Security: Page publique; le prix final (remise -10%) est affiché côté vue mais
          l'achat réel doit toujours être re-validé côté backend.
"""

# backend/routes/pricing_routes.py

from fastapi import Request, APIRouter
from app.utils.templates import templates
from app.models.offers import OFFERS
from app.auth import get_current_user_optional  # doit être async

router = APIRouter()

@router.get("/pricing")
async def pricing_page(request: Request):
    """
    Page de tarification.

    Injecte:
      - plans: liste d'offres (nom, prix, crédits, type, id)
      - has_discount: bool (si l'utilisateur connecté bénéficie d'une remise)
      - user: objet utilisateur (facultatif)

    Notes:
      - get_current_user_optional est async → on l'attend pour récupérer l'user si présent.
      - Les prints de debug existants restent commentés pour te dépanner si besoin.
    """
    #print("🔥 pricing_page CALLED")

    user = await get_current_user_optional(request)
    #print("🔥 user =", user)

    plans = []
    for offer in OFFERS.values():
        plans.append({
            "name": offer["label"],
            "price": offer["price_eur"],
            "credits": offer.get("credits", offer.get("credits_monthly", "∞")),
            "type": offer["type"],
            "offer_id": offer["id"]
        })

    return templates.TemplateResponse("pricing.html", {
        "request": request,
        "plans": plans,
        "has_discount": user.has_discount if user else False,
        "user": user  # facultatif si tu veux afficher d'autres infos
    })
