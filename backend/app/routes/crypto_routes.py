"""
File: backend/routes/crypto_routes.py
Role: Gestion des paiements en crypto via l’API NowPayments.
Depends:
  - backend.utils.offers.get_offer_by_id
  - backend.models.users.get_user_by_token / update_user_after_payment
  - NOWPAYMENTS_API_KEY (variable d’env .env)
Side-effects:
  - Contacte l’API externe NowPayments pour créer une facture.
  - Déclenche update_user_after_payment après webhook "finished".
Security:
  - Vérifie token utilisateur (user_token) fourni dans le body.
  - TODO: sécuriser ipn_callback_url + valider signature NowPayments en prod.
"""

import json
from app.core.config import (
    FRONTEND_URL, PUBLIC_API_URL,
    NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET,
    NOW_MIN_CRYPTO_EUR
)
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from app.utils.invoice_generator import create_invoice
from app.models.offers import get_offer_by_id
from app.models.users import get_user_by_token
from app.utils.logger import logger 
from app.utils.payment_utils import update_user_after_payment
import requests
import os
import hmac
import hashlib

router = APIRouter()
NOWPAYMENTS_API_BASE = "https://api.nowpayments.io/v1"




def verify_nowpayments_signature(raw_body: bytes, signature: str, ipn_secret: str) -> bool:
    """Vérifie la signature HMAC (NOWPayments IPN) avec le **IPN_SECRET** (pas la clé API)."""
    if not ipn_secret:
        return False
    computed_sig = hmac.new(ipn_secret.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed_sig, signature)

@router.post("/payment/crypto/create-order")
async def create_crypto_order(request: Request):
    """
    Crée un ordre de paiement crypto via NowPayments.

    Body JSON attendu:
        {
          "offer_id": "<id_offre>",
          "user_token": "<token_utilisateur>",
          "currency": "usdttrc20" (optionnel, défaut = usdttrc20)
        }

    Retour:
        { "payment_url": "<url_facture>" } si succès,
        sinon { "error": "..."} avec status 500.

    Notes:
        - Calcule le prix (en EUR) avec éventuelle réduction -10% si user.has_discount.
        - Envoie la requête vers /invoice de NowPayments.
        - success_url / cancel_url sont codés en dur (TODO: rendre dynamiques).
    """
    body = await request.json()
    offer_id = body.get("offer_id")
    user_token = body.get("user_token")
    currency = body.get("currency", "usdttrc20")

    if not offer_id or not user_token:
        raise HTTPException(status_code=400, detail="offer_id ou user_token manquant")

    offer = get_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")

    user = get_user_by_token(user_token)

    price_eur = round(float(offer["price_eur"]), 2)

    # 🔒 règle passerelle : blocage des offres < min, sauf cas spécial CREDIT_10
    if price_eur + 1e-9 < NOW_MIN_CRYPTO_EUR and offer_id != "CREDIT_10":
        raise HTTPException(400, detail=f"Montant trop bas pour le paiement crypto (min {NOW_MIN_CRYPTO_EUR:.2f} €).")


    # Cas spécial : pack 10€ en crypto → facturer 10,50 € (et on donnera +1 crédit au webhook)
    if offer_id == "CREDIT_10":
        price_eur = max(10.50, price_eur)
    elif price_eur < NOW_MIN_CRYPTO_EUR:
        # autres packs proches du min (sécurité)
        price_eur = NOW_MIN_CRYPTO_EUR

    headers = {
        "x-api-key": NOWPAYMENTS_API_KEY or "",
        "Content-Type": "application/json"
    }
    if not NOWPAYMENTS_API_KEY:
        raise HTTPException(500, detail="NOWPayments non configuré (NOWPAYMENTS_API_KEY).")

    payload = {
        "price_amount": price_eur,
        "price_currency": "eur",
        "pay_currency": currency,
        "order_id": f"{user_token}_{offer_id}",
        "ipn_callback_url": f"{PUBLIC_API_URL}/api/payment/crypto/webhook",   # ✅ au lieu de TON_NGROK
        "success_url": f"{FRONTEND_URL}/pricing?payment=crypto&status=success",
        "cancel_url": f"{FRONTEND_URL}/pricing?payment=crypto&status=cancel",
    }
    response = requests.post(f"{NOWPAYMENTS_API_BASE}/invoice", json=payload, headers=headers)

    if response.status_code != 200:
        print("NOWPAYMENTS ERROR:", response.text)
        return JSONResponse(status_code=500, content={"error": response.text})

    data = response.json()
    return {"payment_url": data.get("invoice_url")}


@router.post("/payment/crypto/webhook")
async def nowpayments_webhook(request: Request):
    """
    Webhook sécurisé appelé par NowPayments quand un paiement change de statut.
    """
    raw_body = await request.body()
    headers = request.headers
    signature = headers.get("x-nowpayments-sig")

    # ✅ Vérification de la signature
    if not signature or not verify_nowpayments_signature(raw_body, signature, NOWPAYMENTS_IPN_SECRET):
        logger.warning("🚨 Signature NowPayments invalide ou manquante")
        raise HTTPException(status_code=403, detail="Signature invalide")

    # ✅ Décodage JSON après validation
    body = json.loads(raw_body)
    order_id        = body.get("order_id")
    payment_status  = (body.get("payment_status") or "").lower()
    payment_id      = str(body.get("payment_id") or "")
    price_amount    = body.get("price_amount")
    price_currency  = (body.get("price_currency") or "EUR").upper()

    logger.debug(f"📨 Webhook reçu pour order_id={order_id}, status={payment_status}")

    # --- BTZ-PATCH: accepter 'finished' ET 'confirmed' ---
    if payment_status not in {"finished", "confirmed"}:
        return {"status": "waiting", "seen": payment_status}

    # ✅ Traitement du paiement validé
    try:
        user_token, offer_id = (order_id or "").split("_", 1)
        from app.models.users import get_user_by_token
        from app.utils.payment_utils import update_user_after_payment
        user = get_user_by_token(user_token)

        if user:
            # idempotence → passe payment_id en transaction_id
            # + bonus +1 crédit pour l’offre 10€ payée en crypto
            update_user_after_payment(
                user.id, offer_id,
                method="Crypto",
                transaction_id=payment_id,
                bonus_credits=(1 if offer_id == "CREDIT_10" else 0)
            )
            # === Génération de la facture (Crypto / NowPayments) ===
            try:
                # Dans ton create-order, tu envoies price_currency="eur" et price_amount=EUR.
                # Le webhook renvoie normalement ces champs dans le body.
                offer = get_offer_by_id(offer_id) or {}

                # Montant payé en EUR (fallback sur le prix catalogue si absent)
                paid_eur = None
                try: paid_eur = float(price_amount)
                except Exception: paid_eur = None

                # Fallback si manquant
                if paid_eur is None:
                    paid_eur = float(offer.get("price_eur", 0.0))

                items = [{
                    "sku": offer_id,
                    "label": offer.get("label", offer_id),
                    "qty": 1,
                    "unit_amount": paid_eur
                }]
                if offer_id == "CREDIT_10":
                    # ligne informative sur la facture (bonus crédit)
                    items.append({
                        "sku": "CRYPTO_MIN_BONUS",
                        "label": "Bonus crypto (seuil minimum)",
                        "qty": 1,
                        "unit_amount": 0.00
                    })

                create_invoice(
                    user_id=user.id,
                    email=user.email,
                    full_name=(getattr(user, "full_name", None) or f"{user.first_name} {user.last_name}".strip()),
                    method="Crypto",
                    transaction_id=payment_id or order_id or "crypto",
                    amount=paid_eur,
                    currency=price_currency or "EUR",
                    items=items,
                    created_at=None,
                    billing_address=None,
                    tax=None,
                    project_config=None
                )
                logger.info("🧾 Facture Crypto générée.")
            except Exception as _e:
                logger.warning(f"[invoice] Crypto KO: {_e}")

            logger.info(f"✅ Paiement crypto validé pour {user.email}, offre {offer_id}")
        else:
            logger.warning(f"❌ Utilisateur introuvable pour token {user_token}")

        return {"status": "success"}
    except Exception as e:
        logger.error(f"💥 Erreur dans le webhook Crypto : {str(e)}")
        return {"status": "error", "message": str(e)}
