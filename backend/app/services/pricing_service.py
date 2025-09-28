"""
File: backend/app/services/pricing_service.py
Role: Prépare les plans pour la page pricing.
"""

from app.models.offers import OFFERS

def build_pricing_plans():
    plans = []
    for offer in OFFERS.values():
        plans.append({
            "name": offer["label"],
            "price": offer["price_eur"],
            "credits": offer.get("credits", offer.get("credits_monthly", "∞")),
            "type": offer["type"],
            "offer_id": offer["id"]
        })
    return plans
