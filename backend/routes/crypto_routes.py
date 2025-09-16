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
from backend.core.config import FRONTEND_URL, PUBLIC_API_URL
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from backend.utils.invoice_generator import create_invoice
from backend.models.offers import get_offer_by_id
from backend.models.users import get_user_by_token
from backend.utils.logger import logger 
from backend.utils.payment_utils import update_user_after_payment
import requests
import os
import hmac
import hashlib

router = APIRouter()
NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY")
NOWPAYMENTS_API_BASE = "https://api.nowpayments.io/v1"




def verify_nowpayments_signature(raw_body: bytes, signature: str, api_key: str) -> bool:
    """
    Vérifie que la signature HMAC reçue est correcte.
    """
    computed_sig = hmac.new(api_key.encode(), raw_body, hashlib.sha512).hexdigest()
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

    price = offer["price_eur"]
    if user and user.has_discount and offer["type"] in ["one_shot", "credit"]:
        price *= 0.9

    price = round(price, 2)

    headers = {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "price_amount": price,
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
    if not signature or not verify_nowpayments_signature(raw_body, signature, NOWPAYMENTS_API_KEY):
        logger.warning("🚨 Signature NowPayments invalide ou manquante")
        raise HTTPException(status_code=403, detail="Signature invalide")

    # ✅ Décodage JSON après validation
    body = json.loads(raw_body)
    order_id = body.get("order_id")
    payment_status = body.get("payment_status")

    logger.debug(f"📨 Webhook reçu pour order_id={order_id}, status={payment_status}")

    if payment_status != "finished":
        return {"status": "waiting"}

    # ✅ Traitement du paiement validé
    try:
        user_token, offer_id = order_id.split("_", 1)
        from backend.models.users import get_user_by_token
        from backend.utils.payment_utils import update_user_after_payment
        user = get_user_by_token(user_token)

        if user:
            update_user_after_payment(user.id, offer_id, method="Crypto")
            # === Génération de la facture (Crypto / NowPayments) ===
            try:
                # Dans ton create-order, tu envoies price_currency="eur" et price_amount=EUR.
                # Le webhook renvoie normalement ces champs dans le body.
                offer = get_offer_by_id(offer_id) or {}

                paid_eur = None
                try:
                    # Priorité: price_amount côté webhook (EUR)
                    paid_eur = float(body.get("price_amount"))
                except Exception:
                    paid_eur = None

                # Fallback si manquant
                if paid_eur is None:
                    paid_eur = float(offer.get("price_eur", 0.0))

                items = [{
                    "sku": offer_id,
                    "label": offer.get("label", offer_id),
                    "qty": 1,
                    "unit_amount": paid_eur
                }]

                if user:
                    create_invoice(
                        user_id=user.id,
                        email=user.email,
                        full_name=(getattr(user, "full_name", None) or f"{user.first_name} {user.last_name}".strip()),
                        method="Crypto",
                        transaction_id=str(body.get("payment_id") or order_id),
                        amount=paid_eur,
                        currency=(body.get("price_currency", "EUR") or "EUR").upper(),
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
