"""
File: backend/routes/stripe_routes.py
Role: Intégration paiements Stripe:
  - Création d'une session de paiement Checkout
  - Webhook pour confirmer le paiement et créditer l'utilisateur
Depends:
  - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (.env)
  - backend.utils.offers.get_offer_by_id
  - backend.models.users.get_user_by_token / update_user_after_payment
Side-effects:
  - Appels externes à l'API Stripe
  - Mise à jour des crédits utilisateur après paiement
Security:
  - create_stripe_session: attend un user_token (pas d'auth header)
  - webhook: vérification de la signature Stripe (construct_event)
Notes:
  - Les URLs success/cancel sont en localhost: adapte-les pour la prod.
"""

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
from backend.models.offers import get_offer_by_id
from backend.utils.payment_utils import update_user_after_payment
from backend.models.users import get_user_by_token
from backend.utils.logger import logger  

load_dotenv()

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# === 🔐 API Key Stripe (mode test) ===
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# === ✅ Route pour créer une session de paiement ===

@router.post("/api/payment/stripe/session")
async def create_stripe_session(request: Request):
    """
    Crée une session Checkout Stripe à partir d'une offre.

    Body attendu:
      {
        "offer_id": "<id_offre_catalogue>",
        "user_token": "<token_utilisateur>"
      }

    Retour:
      { "url": "<stripe_checkout_url>" }

    Notes:
      - Calcule le prix en centimes (unit_amount) pour Stripe.
      - Si user.has_discount et offre one_shot/credit → applique -10%.
    """
    data = await request.json()
    offer_id = data.get("offer_id")
    user_token = data.get("user_token")

    if not offer_id or not user_token:
        raise HTTPException(status_code=400, detail="offer_id ou user_token manquant")

    offer = get_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvée")

    user = get_user_by_token(user_token)
    price = offer["price_eur"]
    if user and user.has_discount and offer["type"] in ["one_shot", "credit"]:
        price *= 0.9

    unit_amount = int(price * 100)  # Stripe attend un montant en centimes

    try:
        # Crée la session Checkout (mode paiement direct)
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": offer["label"]},
                    "unit_amount": unit_amount,
                },
                "quantity": 1,
            }],
            metadata={
                "offer_id": offer_id,
                "user_token": user_token,
            },
            success_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=cancel",
        )
        return {"url": session.url}
    except Exception as e:
        # Renvoie 500 + message d'erreur Stripe en cas de problème
        raise HTTPException(status_code=500, detail=str(e))


# === 🎯 Webhook Stripe pour traiter le paiement confirmé ===
@router.post("/api/payment/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook Stripe: valide la signature puis crédite l'utilisateur si
    l'événement 'checkout.session.completed' est reçu.

    Retour: {"status":"success"} ou 500 si erreur.
    """
    try:
        logger.debug("✅ Webhook Stripe reçu")  # trace serveur
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        logger.debug(f"📦 Payload reçu: {payload.decode()}")
        logger.debug(f"📩 Signature: {sig_header}")
        logger.debug(f"🔑 Secret utilisé: {webhook_secret}")


        try:
            # Vérification de la signature du webhook
            event = stripe.Webhook.construct_event(
                payload=payload, sig_header=sig_header, secret=webhook_secret
            )
            logger.debug("🎉 Événement Stripe décodé avec succès.")

        except stripe.error.SignatureVerificationError:
            # Signature invalide → on refuse
            print("❌ Signature Stripe invalide.")
            raise HTTPException(status_code=400, detail="Signature invalide")
        
        
        logger.debug(f"📨 Type d'événement : { event['type']}")
        logger.debug(f"📊 Données : {event['data']}")


        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            metadata = session.get("metadata", {})
            offer_id = metadata.get("offer_id")
            user_token = metadata.get("user_token")

            # Match user_id depuis token
            logger.debug(f"🎯 Offre ID : {offer_id} | Token : {user_token}")

            user = get_user_by_token(user_token)
            if user:
                logger.debug(f"👤 Utilisateur trouvé : {user.email}")
                update_user_after_payment(user.id, offer_id, method="Stripe")
                logger.debug(f"✅ Crédit ajouté avec succès.")
            else:
                logger.debug(f"⚠️ Utilisateur non trouvé pour ce token.")

        return JSONResponse(content={"status": "success"})

    except Exception as e:
        logger.debug("❌ Erreur Stripe webhook:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})