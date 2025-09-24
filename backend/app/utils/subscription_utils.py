# PATCH: backend/utils/subscription_utils.py

from datetime import datetime, timedelta
import json
from app.models.offers import get_offer_by_id

# BTZ-PATCH v1.1: centraliser → on prend USERS_FILE depuis app.core.paths
from app.core.paths import USERS_JSON as USERS_FILE

def renew_all_subscriptions():
    """
    ⚠️ Ne crédite plus les abonnements gérés par Stripe.
    Les crédits sont désormais ajoutés via le webhook 'invoice.payment_succeeded'.
    """
    if not USERS_FILE.exists():
        return

    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        updated = False

        for user_id, user in users.items():
            sub = user.get("subscription")
            if not (sub and sub.get("active")):
                continue

            # ⛔ NEW: si provider == 'stripe' → le webhook s’en charge
            if str(sub.get("provider") or "").lower() == "stripe":
                # Optionnel: log doux pour debug
                # print(f"[renew] skip stripe-managed sub for {user_id}")
                continue

            try:
                renew_date = datetime.fromisoformat(sub["renew_date"])
            except Exception as e:
                print(f"❌ Erreur date pour {user_id} : {e}")
                continue

            now = datetime.utcnow()
            if now >= renew_date:
                offer_id = sub["type"]
                offer = get_offer_by_id(offer_id)
                if not offer:
                    print(f"❌ Offre {offer_id} introuvable pour user {user_id}")
                    continue

                monthly_credits = offer.get("credits_monthly", 0)
                user["credits"] += monthly_credits
                user["subscription"]["renew_date"] = (
                    now + timedelta(days=offer.get("duration_days", 30))
                ).isoformat()

                user.setdefault("purchase_history", []).append({
                    "label": "Crédits mensuels",
                    "credits_added": monthly_credits,
                    "price_paid": 0,
                    "date": now.isoformat(),
                    "method": "renewal",
                    "discount_applied": "auto"
                })

                updated = True

        if updated:
            f.seek(0)
            json.dump(users, f, indent=2)
            f.truncate()
