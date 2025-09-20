import json
from datetime import datetime, timedelta
from backend.models.users import USERS_FILE
from backend.models.offers import get_offer_by_id



# 💳 Mettre à jour un utilisateur après un paiement
def update_user_after_payment(
    user_id: str,
    offer_id: str,
    method: str,
    transaction_id: str | None = None,
    bonus_credits: int = 0,
    order_id: str | None = None,   # ✅ param optionnel pour PayPal et dédup
):
    """
    Applique les effets d’un paiement :
    - Ajoute des crédits si achat one_shot
    - Met en place un abonnement si nécessaire
    - Enregistre l’historique de la transaction
    - Bloque les doublons PayPal via order_id
    """
    if not USERS_FILE.exists():
        return False
    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        if user_id not in users:
            return False
        user = users[user_id]

        # 🔐 Anti-doublon générique (Stripe/Autres) si on a un identifiant
        dedup_id = transaction_id or order_id
        if dedup_id:
            for tx in user.get("purchase_history", []):
                if tx.get("transaction_id") == dedup_id or tx.get("order_id") == dedup_id:
                    print(f"⚠️ Paiement déjà enregistré — {dedup_id}")
                    return False

        offer = get_offer_by_id(offer_id)
        if not offer:
            return False

        user = users[user_id]
        price = offer["price_eur"]
        discount_str = "None"
        total_credits = 0

        # ⛔️ Vérif anti-double si PayPal
        if method == "PayPal" and order_id:
            for tx in user.get("purchase_history", []):
                if tx.get("order_id") == order_id:
                    print(f"⚠️ Paiement PayPal déjà enregistré — {order_id}")
                    return False  # doublon détecté

        # ✅ Appliquer réduction -10% si applicable
        if user.get("has_discount") and offer["type"] in ["one_shot", "credit"]:
            price = round(price * 0.9, 2)
            discount_str = "10%"

        # 🎁 Cas achat one_shot → ajout de crédits
        if (offer.get("type") in ("one_shot", "credit")):
            import math
            base_credits = offer["credits"]
            # +10% si abonné, arrondi AU SUPÉRIEUR (ex: 25 -> +3)
            bonus_from_sub = math.ceil(base_credits * 0.10) if add_subscriber_bonus else 0
            total_credits = base_credits + bonus_from_sub + int(bonus_credits or 0)
            user["credits"] += total_credits

        # 🔄 Cas abonnement → changement de plan + ajout crédits mensuels
        elif offer["type"] == "subscription":
            user["plan"] = offer_id
            user["subscription"] = {
                "type": offer_id,
                "start_date": datetime.utcnow().isoformat(),
                "renew_date": (datetime.utcnow() + timedelta(days=offer.get("duration_days", 30))).isoformat(),
                "active": True
            }
            user["priority_backtest"] = offer.get("priority_backtest", False)
            user["has_discount"] = offer.get("discount_rate", 0) > 0
            total_credits = offer.get("credits_monthly", 0)
            user["credits"] += total_credits

        # 📝 Ajout de l’historique d’achat
        tx = {
            "offer_id": offer_id,
            "credits_added": total_credits,
            "price_paid": price,
            "date": datetime.utcnow().isoformat(),
            "method": method,
            "discount_applied": ("10% credits" if bool(user.get("has_discount")) else "None")
        }
        if order_id:
            tx["order_id"] = order_id
        if transaction_id:
            tx["transaction_id"] = transaction_id
        if bonus_credits:
            tx["bonus_credits"] = int(bonus_credits)

        user.setdefault("purchase_history", []).append(tx)

        f.seek(0)
        json.dump(users, f, indent=2)
        f.truncate()
    return True