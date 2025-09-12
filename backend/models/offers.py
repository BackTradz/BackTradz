# offers.py
#
# 📁 Module central listant toutes les offres (crédits & abonnements).
# 🎯 Permet de récupérer une offre via son ID, pour l’affichage pricing,
#    la création d’ordres (Stripe/PayPal/NowPayments) et la mise à jour user.
# 🧩 Évolutif: champs "bonus_triggered", "promo_code_applicable" prévus pour features futures.

from datetime import timedelta

# Dictionnaire des offres disponibles
OFFERS = {
    # 🎁 OFFRES ONE-SHOT (non récurrentes)
    "CREDIT_5": {
        "id": "CREDIT_5",
        "type": "one_shot",
        "price_eur": 5,
        "credits": 5,
        "label": "5 crédits pour 5€",
        "bonus_triggered": False,
        "promo_code_applicable": True,
    },
    "CREDIT_10": {
        "id": "CREDIT_10",
        "type": "one_shot",
        "price_eur": 10,
        "credits": 12,
        "label": "12 crédits pour 10€",
        "bonus_triggered": False,
        "promo_code_applicable": True,
    },
    "CREDIT_20": {
        "id": "CREDIT_20",
        "type": "one_shot",
        "price_eur": 20,
        "credits": 25,
        "label": "25 crédits pour 20€",
        "bonus_triggered": False,
        "promo_code_applicable": True,
    },
    "CREDIT_50": {
        "id": "CREDIT_50",
        "type": "one_shot",
        "price_eur": 50,
        "credits": 75,
        "label": "75 crédits pour 50€",
        "bonus_triggered": True,  # ex: badge fidélité plus tard
        "promo_code_applicable": True,
    },

    # 🔁 ABONNEMENTS MENSUELS
    "SUB_9": {
        "id": "SUB_9",
        "type": "subscription",
        "price_eur": 9,
        "credits_monthly": 10,
        "discount_rate": 0.10,      # -10% sur achats crédits
        "priority_backtest": True,  # file prioritaire
        "label": "9€/mois - 10 crédits et plus",
        "duration_days": 30,
        "stripe_price_id": "price_1S6HhpJ7lIaOTbzgT3xAN8cU"   # ← ajoute l’ID Stripe du plan à 9€
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
        "stripe_price_id": "price_1S6Hi5J7lIaOTbzgybR5TeKy"  # ← ajoute l’ID Stripe du plan à 25€
    },

}

def get_offer_by_id(offer_id: str):
    """🔍 Renvoie le dict d’offre correspondant à `offer_id` (ou None)."""
    return OFFERS.get(offer_id)
