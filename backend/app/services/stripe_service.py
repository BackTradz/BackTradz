"""
File: backend/app/services/stripe_service.py
Role: Helpers pour intégration Stripe (clé API, resolver de price).
"""

import os, stripe
from fastapi import HTTPException
from app.utils.logger import logger

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def resolve_price_for_offer(offer_id: str, offer: dict) -> str:
    env_direct = os.getenv(f"STRIPE_PRICE_{offer_id}")
    if env_direct and env_direct.startswith("price_"):
        return env_direct
    env_key = offer.get("stripe_env_key")
    if env_key:
        val = os.getenv(env_key)
        if val and val.startswith("price_"):
            return val
    lookup = os.getenv(f"STRIPE_LOOKUP_{offer_id}")
    if lookup:
        try:
            res = stripe.Price.list(active=True, lookup_keys=[lookup], limit=1)
            if res.data:
                return res.data[0].id
        except Exception as _e:
            logger.warning(f"[stripe] lookup_key KO: {lookup} → {_e}")
    legacy = offer.get("stripe_price_id")
    if legacy and legacy.startswith("price_"):
        return legacy
    raise HTTPException(status_code=500, detail=f"Stripe price introuvable pour {offer_id}")
