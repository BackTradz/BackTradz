"""
File: backend/routes/paypal_routes.py
Role: Gestion des paiements via PayPal API (Sandbox).
Depends:
  - backend.models.users (get_user_by_token, update_user_after_payment)
  - backend.utils.offers.get_offer_by_id
  - PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (.env)
Side-effects:
  - Appelle l’API externe PayPal (sandbox).
  - Met à jour crédits utilisateurs après capture.
Security:
  - Vérifie user_token fourni dans body (non via auth header).
  - TODO: sécuriser davantage en prod (vérifier webhook IPN ou JWT PayPal).
"""

from fastapi import APIRouter, Request, HTTPException
import requests
from app.models.offers import get_offer_by_id
from app.utils.invoice_generator import create_invoice
from app.utils.logger import logger  
from app.models.users import get_user_by_token
from app.utils.payment_utils import update_user_after_payment
from fastapi.responses import JSONResponse
from app.core.config import FRONTEND_URL

import json
import os

router = APIRouter()



PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")

PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"

def get_paypal_access_token():
    """
    Récupère un access_token OAuth PayPal via client_id + secret.
    """
    print("CLIENT_ID:", PAYPAL_CLIENT_ID)
    print("CLIENT_SECRET:", PAYPAL_CLIENT_SECRET)
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/oauth2/token",
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        headers={"Accept": "application/json"},
        data={"grant_type": "client_credentials"}
    )
    response.raise_for_status()
    return response.json()["access_token"]

@router.post("/payment/paypal/create-order")
async def create_order(request: Request):
    """
    Crée une commande PayPal.

    Body attendu:
        { "offer_id": "...", "user_token": "..." }

    Retour:
        { "id": "<paypal_order_id>" }
    """
    body = await request.json()
    offer_id = body.get("offer_id")
    user_token = body.get("user_token")

    offer = get_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvée")

    user = get_user_by_token(user_token)

    price = offer["price_eur"]
    if user and user.has_discount and offer["type"] in ["one_shot", "credit"]:
        price *= 0.9

    name = offer["label"]

    access_token = get_paypal_access_token()

    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": { "currency_code": "EUR", "value": f"{price:.2f}" },
                "description": name
            }
        ],
        "application_context": {
            "return_url": f"{FRONTEND_URL}/pricing?payment=paypal&status=success",
            "cancel_url": f"{FRONTEND_URL}/pricing?payment=paypal&status=cancel",
        }
    }

    response = requests.post(
        f"{PAYPAL_API_BASE}/v2/checkout/orders",
        json=order_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )
    response.raise_for_status()
    data = response.json()
    return {"id": data["id"]}

@router.post("/payment/paypal/capture-order")
async def capture_order(request: Request):
    """
    Capture une commande PayPal après retour frontend.

    Body attendu:
        { "orderID": "...", "offer_id": "...", "user_token": "..." }

    Retour:
        { "status": "success|fail", "message": "..." }
    """
    body = await request.json()
    order_id = body.get("orderID")
    offer_id = body.get("offer_id")
    user_token = body.get("user_token")

    access_token = get_paypal_access_token()
    # creer un orde paypal
    capture_response = requests.post(
        f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )
    capture_response.raise_for_status()
    result = capture_response.json()
    # ✅ Vérifie le paiement
    if result.get("status") == "COMPLETED":
        user = get_user_by_token(user_token)
        if user:
            orderID = result.get("orderID") or result.get("id")  # <- PayPal renvoie souvent "id"

            # 🔒 Vérifie si le paiement est déjà dans l'historique
            for tx in user.purchase_history or []:
                if tx.get("method") == "PayPal" and tx.get("order_id") == orderID:
                    logger.warning(f"⚠️ Paiement PayPal déjà capturé : {orderID}")
                    return JSONResponse({"status": "already_captured", "message": "Déjà crédité"})

            # ✅ Sinon, on crédite et on enregistre
            update_user_after_payment(user.id, offer_id, method="PayPal", order_id=orderID)
            # === Génération de la facture (PayPal) ===
            try:
                offer = get_offer_by_id(offer_id) or {}
                # Montant payé côté PayPal:
                # result["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"]
                paid_eur_str = "0"
                try:
                    paid_eur_str = (
                        result.get("purchase_units", [{}])[0]
                            .get("payments", {})
                            .get("captures", [{}])[0]
                            .get("amount", {})
                            .get("value", "0")
                    )
                except Exception:
                    pass
                paid_eur = round(float(paid_eur_str), 2)

                orderID = result.get("orderID") or result.get("id") or order_id

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
                        method="PayPal",
                        transaction_id=orderID,
                        amount=paid_eur,
                        currency="EUR",
                        items=items,
                        created_at=None,
                        billing_address=None,
                        tax=None,
                        project_config=None
                    )
                    logger.debug("🧾 Facture PayPal générée.")
            except Exception as _e:
                logger.warning(f"[invoice] PayPal KO: {_e}")


    

        return {"status": "success", "message": "Crédits ajoutés"}
    else:
        return {"status": "fail", "message": "Paiement non capturé"}
