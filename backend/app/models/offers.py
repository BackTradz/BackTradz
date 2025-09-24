# offers.py
#
# 📁 Module central listant toutes les offres (crédits & abonnements).
# 🎯 Permet de récupérer une offre via son ID, pour l’affichage pricing,
#    la création d’ordres (Stripe/PayPal/NowPayments) et la mise à jour user.
# 🧩 Évolutif: champs "bonus_triggered", "promo_code_applicable" prévus pour features futures.

# offers.py
import os
from datetime import timedelta

def _env(k: str) -> str | None:
    return os.getenv(k)

OFFERS = {
    # ONE-SHOT
    "CREDIT_5": {
        "id": "CREDIT_5",
        "type": "one_shot",
        "price_eur": 5,
        "credits": 5,
        "label": "5 crédits pour 5€",
        # on lit STRIPE_PRICE_CREDIT_5 en prod
        "stripe_env_key": "STRIPE_PRICE_CREDIT_5",
    },
    "CREDIT_10": {
        "id": "CREDIT_10",
        "type": "one_shot",
        "price_eur": 10,
        "credits": 12,
        "label": "12 crédits pour 10€",
        "stripe_env_key": "STRIPE_PRICE_CREDIT_10",
    },
    "CREDIT_20": {
        "id": "CREDIT_20",
        "type": "one_shot",
        "price_eur": 20,
        "credits": 25,
        "label": "25 crédits pour 20€",
        "stripe_env_key": "STRIPE_PRICE_CREDIT_20",
    },
    "CREDIT_50": {
        "id": "CREDIT_50",
        "type": "one_shot",
        "price_eur": 50,
        "credits": 75,
        "label": "75 crédits pour 50€",
        "stripe_env_key": "STRIPE_PRICE_CREDIT_50",
    },

    # SUBS
    "SUB_9": {
        "id": "SUB_9",
        "type": "subscription",
        "price_eur": 9,
        "credits_monthly": 10,
        "discount_rate": 0.10,
        "priority_backtest": True,
        "label": "9€/mois - 10 crédits et plus",
        "duration_days": 30,
        # En prod on lira STRIPE_PRICE_SUB_9
        "stripe_env_key": "STRIPE_PRICE_SUB_9",
        # ancien fallback éventuel (optionnel): "stripe_price_id": "price_..."
    },
    "SUB_25": {
        "id": "SUB_25",
        "type": "subscription",
        "price_eur": 25,
        "credits_monthly": 30,
        "discount_rate": 0.10,
        "priority_backtest": True,
        "label": "25€/mois - 30 crédits et plus",
        "duration_days": 30,
        "stripe_env_key": "STRIPE_PRICE_SUB_25",
    },
}

def get_offer_by_id(offer_id: str):
    return OFFERS.get(offer_id)
