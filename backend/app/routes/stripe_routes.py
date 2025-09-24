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
import json
from dotenv import load_dotenv
from app.models.offers import get_offer_by_id
from app.utils.payment_utils import update_user_after_payment
from app.models.users import get_user_by_token, USERS_FILE
from app.utils.logger import logger  
from fastapi import HTTPException
from app.core.config import FRONTEND_URL
from pathlib import Path
from app.models.users import (
    get_user_by_token,
    activate_subscription_without_credits,   # NEW
    add_monthly_credits_after_invoice_paid,  # NEW
    mark_subscription_payment_failed,        # NEW
)

from app.utils.invoice_generator import create_invoice
from app.utils.email_sender import send_email_html
from app.utils.email_templates import (
    subscription_failed_subject,
    subscription_failed_html,
    subscription_failed_text,
)
from app.models.users import USERS_FILE as USERS_JSON_PATH

load_dotenv()

router = APIRouter()


# === 🔐 API Key Stripe (mode test) ===
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# --- Resolver de Price Stripe (ENV -> lookup_key -> fallback offers)
def resolve_price_for_offer(offer_id: str) -> str:
    from backend.models.offers import get_offer_by_id  # local import pour éviter cycles
    offer = get_offer_by_id(offer_id) or {}
    # 1) ENV direct par convention STRIPE_PRICE_<OFFER_ID>
    env_direct = os.getenv(f"STRIPE_PRICE_{offer_id}")
    if env_direct and env_direct.startswith("price_"):
        return env_direct

    # 2) ENV via clé déclarée dans l’offre ("stripe_env_key")
    env_key = offer.get("stripe_env_key")
    if env_key:
        val = os.getenv(env_key)
        if val and val.startswith("price_"):
            return val

    # 3) ENV via lookup_key (optionnel) : STRIPE_LOOKUP_<OFFER_ID>
    lookup = os.getenv(f"STRIPE_LOOKUP_{offer_id}")
    if lookup:
        res = stripe.Price.list(active=True, lookup_keys=[lookup], limit=1)
        if res.data:
            return res.data[0].id

    # 4) Fallback (legacy): champ 'stripe_price_id' dans l’offre
    legacy = offer.get("stripe_price_id")
    if legacy and legacy.startswith("price_"):
        return legacy

    raise HTTPException(status_code=500, detail=f"Stripe price introuvable pour {offer_id}")

# === ✅ Route pour créer une session de paiement ===

@router.post("/payment/stripe/session")
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

    is_subscription = (offer.get("type") == "subscription")
    price = offer["price_eur"]

    # ✅ SAFE: supporte user objet OU dict
    has_discount = False
    if user:
        if hasattr(user, "has_discount"):
            has_discount = bool(getattr(user, "has_discount", False))
        elif isinstance(user, dict):
            has_discount = bool(user.get("has_discount", False))


    unit_amount = int(price * 100)  # Stripe attend un montant en centimes

    try:
        # --- Résolution robuste du price Stripe (ENV -> lookup_key -> legacy) ---
        def _resolve_price_id(offer_id: str, offer: dict) -> str | None:
            # 1) ENV direct: STRIPE_PRICE_<OFFER_ID> = price_xxx
            pid = os.getenv(f"STRIPE_PRICE_{offer_id}")
            if pid and pid.startswith("price_"):
                return pid

            # 2) ENV via clé déclarée dans l’offre (si tu ajoutes offer["stripe_env_key"])
            env_key = (offer or {}).get("stripe_env_key")
            if env_key:
                val = os.getenv(env_key)
                if val and val.startswith("price_"):
                    return val

            # 3) ENV lookup_key: STRIPE_LOOKUP_<OFFER_ID> = backtradz_...
            lookup = os.getenv(f"STRIPE_LOOKUP_{offer_id}")
            if lookup:
                try:
                    res = stripe.Price.list(active=True, lookup_keys=[lookup], limit=1)
                    if res.data:
                        return res.data[0].id
                except Exception as _e:
                    logger.warning(f"[stripe] lookup_key KO: {lookup} → {_e}")

            # 4) Fallback legacy: offer["stripe_price_id"]
            legacy = (offer or {}).get("stripe_price_id")
            if legacy and legacy.startswith("price_"):
                return legacy

            return None

        if is_subscription:
            # 💡 En prod, on veut absolument un price existant
            price_id = _resolve_price_id(offer_id, offer)
            if not price_id:
                raise HTTPException(status_code=500, detail=f"Stripe price introuvable pour {offer_id}")

            # --- déterminer/assurer un customer Stripe ---
            customer_id = None
            try:
                # si l'utilisateur a déjà un customer Stripe, on le réutilise
                sub = getattr(user, "subscription", None) if user else None
                if isinstance(sub, dict):
                    customer_id = sub.get("stripe_customer_id")

                if not customer_id:
                    # créer un customer dédié (pas de customer_email dans Checkout)
                    created = stripe.Customer.create(
                        email=(getattr(user, "email", None) if user else None),
                        metadata={"user_token": user_token}
                    )
                    customer_id = created.id
            except Exception as _e:
                logger.warning(f"[stripe] customer ensure KO: {_e}")
                customer_id = None  # Checkout saura en créer un si vraiment nécessaire

            # --- créer la session Checkout SUBSCRIPTION ---
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                client_reference_id=user_token,  # traçabilité
                metadata={"offer_id": offer_id, "user_token": user_token},
                subscription_data={"metadata": {"offer_id": offer_id, "user_token": user_token}},
                customer=customer_id,  # ✅ on passe un customer explicite si dispo
                success_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=success&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=cancel",
                allow_promotion_codes=True,
            )

        else:
            # One-shot: on utilise d’abord un price existant ; sinon fallback inline (pas idéal, mais no-break)
            price_id = _resolve_price_id(offer_id, offer)
            if price_id:
                session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    mode="payment",
                    line_items=[{"price": price_id, "quantity": 1}],
                    metadata={"offer_id": offer_id, "user_token": user_token},
                    success_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=success&session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=cancel",
                    allow_promotion_codes=True,
                )
            else:
                # Fallback (dernier recours) — conserve ton comportement actuel pour ne rien casser
                unit_amount = int(price * 100)
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
                    metadata={"offer_id": offer_id, "user_token": user_token},
                    success_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=success&session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{FRONTEND_URL}/pricing?payment=stripe&status=cancel",
                )
        return {"url": session.url}


    except Exception as e:
        logger.exception(f"[stripe_session] create error: {e}")  # log serveur
        # Renvoie 500 + message d'erreur Stripe en cas de problème
        raise HTTPException(status_code=500, detail=str(e))

# === 🎯 Webhook Stripe pour traiter le paiement confirmé ===
@router.post("/payment/stripe/webhook")
async def stripe_webhook(request: Request):

    """
    Webhook Stripe — sécurisé par signature.
    - checkout.session.completed :
        - mode=payment       → crédite immédiatement (one-shot) + facture
        - mode=subscription  → n'ajoute pas de crédits ici ; on active l'abo SANS crédits
    - invoice.payment_succeeded → ajoute les crédits (1er paiement + renouvellements) + facture locale
    - invoice.payment_failed    → désactive l'abo (past_due) + email d'échec (hosted_invoice_url si dispo) + cancel_at=J+7
    """
    payload = await request.body()
    # Header case-insensitive, on gère les deux par sécurité
    sig_header = request.headers.get("Stripe-Signature") or request.headers.get("stripe-signature")

    # 🔀 Choix auto du secret: LIVE si livemode=True, sinon TEST
    try:
        preview = json.loads(payload.decode("utf-8"))
        livemode = bool(preview.get("livemode"))
    except Exception:
        livemode = True  # par défaut on considère LIVE

    secret = (
        os.getenv("STRIPE_WEBHOOK_SECRET_LIVE") if livemode
        else os.getenv("STRIPE_WEBHOOK_SECRET_TEST")
    ) or os.getenv("STRIPE_WEBHOOK_SECRET")  # fallback si tu n'as qu'une seule variable

    if not secret:
        raise HTTPException(status_code=500, detail="Webhook secret manquant")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=secret
        )
        logger.debug("🎉 Événement Stripe décodé avec succès.")
    except stripe.error.SignatureVerificationError:
        logger.warning("❌ Signature Stripe invalide.")
        raise HTTPException(status_code=400, detail="Signature invalide")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    evt_type = event.get("type")
    logger.debug(f"📨 Type d'événement : {evt_type}")

    # =========================================================
    # A) CHECKOUT SESSION COMPLETED
    # =========================================================
    if evt_type == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata") or {}
        offer_id = metadata.get("offer_id")
        user_token = metadata.get("user_token")
        mode = session.get("mode")  # "payment" | "subscription"

        logger.debug(f"🎯 checkout.completed → offer={offer_id} token={user_token} mode={mode}")

        user = get_user_by_token(user_token)
        if not user:
            logger.warning("⚠️ Utilisateur introuvable pour ce token.")
            return JSONResponse(content={"status": "ignored"})

        # ---------------------------
        # A1) ONE-SHOT (inchangé)
        # ---------------------------
        if mode == "payment":
            # Récupère un identifiant robuste
            tx_id = session.get("payment_intent") or session.get("id") or "stripe-session"

            # ⚠️ user peut être objet OU dict → sécurise l'accès à l'id/email
            user_id = getattr(user, "id", None) if not isinstance(user, dict) else user.get("id")
            if not user_id:
                logger.warning("⚠️ user.id manquant — paiement ignoré.")
                return JSONResponse(content={"status": "ignored"})

            update_user_after_payment(user_id, offer_id, method="Stripe", transaction_id=tx_id)

            # Montant payé (fallbacks robustes)
            paid_eur = None
            amount_total = session.get("amount_total")
            if isinstance(amount_total, int):
                paid_eur = amount_total / 100.0
            if paid_eur is None:
                try:
                    pi_id = session.get("payment_intent")
                    if pi_id:
                        pi = stripe.PaymentIntent.retrieve(pi_id)
                        amt = pi.get("amount_received") or pi.get("amount")
                        if isinstance(amt, int):
                            paid_eur = amt / 100.0
                except Exception:
                    paid_eur = None
            if paid_eur is None:
                offer = get_offer_by_id(offer_id) or {}
                base = float(offer.get("price_eur", 0.0))
                # has_discount si tu le gères ici (optionnel)
                paid_eur = base

            # Facture locale (one-shot)
            try:
                offer = get_offer_by_id(offer_id) or {}
                items = [{
                    "sku": offer_id,
                    "label": offer.get("label", offer_id),
                    "qty": 1,
                    "unit_amount": paid_eur
                }]

                # email & nom robustes (objet ou dict)
                user_email = getattr(user, "email", None) if not isinstance(user, dict) else user.get("email")
                full_name = (
                    getattr(user, "full_name", None)
                    if not isinstance(user, dict) else user.get("full_name")
                )
                if not full_name:
                    if isinstance(user, dict):
                        full_name = f"{user.get('first_name','')} {user.get('last_name','')}".strip()
                    else:
                        full_name = f"{getattr(user,'first_name','')} {getattr(user,'last_name','')}".strip()

                create_invoice(
                    user_id=user_id,
                    email=user_email,
                    full_name=full_name,
                    method="Stripe",
                    transaction_id=tx_id,
                    amount=paid_eur,
                    currency="EUR",
                    items=items,
                    created_at=None,
                    billing_address=None,
                    tax=None,
                    project_config=None
                )
                logger.debug("🧾 Facture Stripe générée (one-shot).")
            except Exception as _e:
                logger.warning(f"[invoice@checkout.payment] KO: {_e}")

            logger.debug("✅ Crédit one-shot ajouté avec succès.")

        # ---------------------------
        # A2) SUBSCRIPTION (inchangé)
        # ---------------------------
        elif mode == "subscription":
            # pas de crédits ici ; on attend invoice.payment_succeeded
            stripe_customer_id = session.get("customer")          # cus_***
            stripe_subscription_id = session.get("subscription")  # sub_***

            user_id = getattr(user, "id", None) if not isinstance(user, dict) else user.get("id")
            if not user_id:
                logger.warning("⚠️ user.id manquant — activation abo ignorée.")
                return JSONResponse(content={"status": "ignored"})

            ok = activate_subscription_without_credits(
                user_id, offer_id,
                provider="stripe",
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id
            )
            if ok:
                logger.debug(f"📌 Subscription activée sans crédits (user={user_id}, sub={stripe_subscription_id}).")
            else:
                logger.warning("⚠️ activate_subscription_without_credits a échoué.")

        return JSONResponse(content={"status": "success"})

    # =========================================================
    # B) INVOICE PAYMENT SUCCEEDED  (1er paiement + renouvellements)
    # =========================================================
    if evt_type in ("invoice.payment_succeeded", "invoice.paid"):
        invoice = event["data"]["object"]

        sub_id = invoice.get("subscription")           # sub_***
        cust_id = invoice.get("customer")              # cus_***
        billing_reason = invoice.get("billing_reason") # 'subscription_create' | 'subscription_cycle'...

        # Charger les users
        users = json.loads(USERS_JSON_PATH.read_text(encoding="utf-8")) if USERS_JSON_PATH.exists() else {}
        # Finder: subscription_id -> customer_id (⚠️ pas de fallback email)
        user_id = None
        offer_id = None

        if sub_id:
            for uid, u in users.items():
                sub = (u.get("subscription") or {})
                if sub.get("stripe_subscription_id") == sub_id:
                    user_id = uid
                    offer_id = sub.get("type")
                    break

        if not user_id and cust_id:
            for uid, u in users.items():
                sub = (u.get("subscription") or {})
                if sub.get("stripe_customer_id") == cust_id:
                    user_id = uid
                    offer_id = sub.get("type")
                    break

        if not user_id:
            logger.warning("⚠️ invoice.payment_succeeded: user introuvable (sub_id/cust_id).")
            return JSONResponse(content={"status": "ignored"})

        # Si l’abo n’est pas encore posé (ordre inversé), l’initialiser maintenant
        u = users[user_id]
        sub = u.setdefault("subscription", {})
        changed = False
        if not sub.get("provider"):
            sub["provider"] = "stripe"; changed = True
        if sub_id and not sub.get("stripe_subscription_id"):
            sub["stripe_subscription_id"] = sub_id; changed = True
        if cust_id and not sub.get("stripe_customer_id"):
            sub["stripe_customer_id"] = cust_id; changed = True
        if not sub.get("active"):
            sub["active"] = True; sub["status"] = "active"; changed = True
        if not sub.get("type") and offer_id:
            sub["type"] = offer_id; changed = True
        # reset du flag mail si on avait eu un échec avant
        if sub.get("failed_mail_sent"):
            sub["failed_mail_sent"] = False; changed = True

        if changed:
            USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")

        # 🔒 Anti-doublons (idempotence par facture)
        txn_id = invoice.get("id")  # ex: in_123...
        u = users[user_id]
        history = u.setdefault("purchase_history", [])

        if any(it.get("transaction_id") == txn_id for it in history):
            logger.info(f"[invoice webhook] duplicate (history) {txn_id} → ignore.")
            return JSONResponse(content={"status": "duplicate_ignored"})

        # 1) si déjà traité → on ignore immédiatement
        if sub.get("last_credited_invoice_id") == txn_id:
            logger.info(f"[invoice webhook] invoice {txn_id} déjà traitée → ignore.")
            return JSONResponse(content={"status": "duplicate_ignored"})

        # 2) on pose le verrou et on SAUVE tout de suite (write-through)
        sub["last_credited_invoice_id"] = txn_id
        USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")

        if any(it.get("transaction_id") == txn_id for it in history):
            logger.info(f"[invoice webhook] duplicate invoice {txn_id} → ignored (no double credit).")
            return JSONResponse(content={"status": "duplicate_ignored"})

        # ✅ AJOUT DES CRÉDITS (une seule fois par facture)
        add_monthly_credits_after_invoice_paid(user_id, offer_id, billing_reason=billing_reason)
        logger.debug(f"✅ Crédits ajoutés après paiement (user={user_id}, reason={billing_reason}).")

                # Facture locale (abo payé)
        try:
            paid_eur = None
            total = invoice.get("amount_paid") or invoice.get("amount_due")  # centimes
            if isinstance(total, int):
                paid_eur = total / 100.0

            offer = get_offer_by_id(offer_id) or {}
            items = [{
                "sku": offer_id,
                "label": offer.get("label", offer_id),
                "qty": 1,
                "unit_amount": (paid_eur if paid_eur is not None else float(offer.get("price_eur", 0.0))),
            }]

            txn_id = invoice.get("id") or invoice.get("subscription") or "stripe-invoice"

            user_obj = users.get(user_id) or {}
            user_email = user_obj.get("email")
            full_name = (user_obj.get("full_name")
                         or f"{user_obj.get('first_name','')} {user_obj.get('last_name','')}".strip())

            create_invoice(
                user_id=user_id,
                email=user_email,
                full_name=full_name,
                method="Stripe",
                transaction_id=txn_id,
                amount=(paid_eur if paid_eur is not None else float(offer.get("price_eur", 0.0))),
                currency="EUR",
                items=items,
                created_at=None,
                billing_address=None,
                tax=None,
                project_config=None
            )
            logger.debug("🧾 Facture locale générée (abo, invoice.payment_succeeded).")
        except Exception as _e:
            logger.warning(f"[invoice@invoice.succeeded] KO: {_e}")

        # Nettoyage grace period (si présent, inchangé)
        try:
            from app.models.users import clear_grace_period  # si existe
            try:
                clear_grace_period(user_id)
            except TypeError:
                pass
        except Exception:
            pass

        return JSONResponse(content={"status": "success"})

    # =========================================================
    # C) INVOICE PAYMENT FAILED (désactivation + email + cancel_at=J+7)
    # =========================================================
    if evt_type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        sub_id = invoice.get("subscription")
        last_err = (invoice.get("last_payment_error") or {}).get("message")
        pay_url = invoice.get("hosted_invoice_url") or f"{FRONTEND_URL}/billing"

        users = json.loads(USERS_JSON_PATH.read_text(encoding="utf-8")) if USERS_JSON_PATH.exists() else {}

        user_id = None
        for uid, u in users.items():
            sub = (u.get("subscription") or {})
            if sub.get("stripe_subscription_id") == sub_id:
                user_id = uid
                break

        if not user_id:
            logger.warning("⚠️ invoice.payment_failed: user introuvable pour cette subscription.")
            return JSONResponse(content={"status": "ignored"})

        # 1) Statut past_due + journal (inchangé)
        mark_subscription_payment_failed(user_id, reason=last_err)

        # 2) Démarrer la période de grâce (inchangé)
        try:
            from app.models.users import start_grace_period
            try:
                start_grace_period(user_id, days=7)
            except TypeError:
                pass
        except Exception:
            pass

        # 3) Sauver un lien de paiement (inchangé)
        try:
            u = users[user_id]
            sub = u.setdefault("subscription", {})
            sub["pay_url"] = pay_url
            USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")
        except Exception as _e:
            logger.warning(f"[pay_url@invoice_failed] KO: {_e}")

        # 4) ✅ Programmer la résiliation auto à J+7 (amélioration sans régression)
        try:
            import time
            cancel_ts = int(time.time()) + 7 * 24 * 3600
            if sub_id:
                try:
                    stripe.Subscription.modify(sub_id, cancel_at=cancel_ts)
                    logger.debug(f"⏳ cancel_at programmé à {cancel_ts} pour {sub_id}")
                except Exception as _e:
                    logger.warning(f"[stripe cancel_at] KO: {_e}")
            # On stocke l'info localement à titre informatif
            try:
                u = users[user_id]
                sub = u.setdefault("subscription", {})
                sub["grace_deadline"] = cancel_ts
                USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")
            except Exception:
                pass
        except Exception:
            pass

        # 5) 📧 Email d’échec — une seule fois (typo fix: info)
        try:
            u = users[user_id]
            sub = u.setdefault("subscription", {})
            if not sub.get("failed_mail_sent"):
                user_email = u.get("email")
                if user_email:
                    send_email_html(
                        user_email,
                        subscription_failed_subject(),
                        subscription_failed_html(pay_url),
                        subscription_failed_text(pay_url)
                    )
                    sub["failed_mail_sent"] = True
                    USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")
                    logger.info("📧 Email d'échec de renouvellement envoyé (unique).")
        except Exception as _e:
            logger.warning(f"[email@invoice.failed] KO: {_e}")

        return JSONResponse(content={"status": "success"})

    # =========================================================
    # D) CUSTOMER SUBSCRIPTION DELETED (annulation depuis Stripe)
    # =========================================================
    if evt_type == "customer.subscription.deleted":
        sub_obj = event["data"]["object"]
        sub_id = sub_obj.get("id")  # sub_***

        users = json.loads(USERS_JSON_PATH.read_text(encoding="utf-8")) if USERS_JSON_PATH.exists() else {}

        target_user_id = None
        for uid, u in users.items():
            s = (u.get("subscription") or {})
            if s.get("stripe_subscription_id") == sub_id:
                target_user_id = uid
                break

        if not target_user_id:
            logger.warning("⚠️ customer.subscription.deleted: user introuvable pour cette subscription.")
            return JSONResponse(content={"status": "ignored"})

        # Mets à jour localement (sans casser le reste)
        try:
            from app.models.users import cancel_subscription
            cancel_subscription(target_user_id)
        except Exception:
            u = users[target_user_id]
            sub = u.setdefault("subscription", {})
            sub["active"] = False
            sub["status"] = "canceled"
            sub["canceled_at"] = sub_obj.get("canceled_at") or sub_obj.get("ended_at")
            USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")

        logger.debug(f"🔁 Synced local cancel after Stripe deletion (user={target_user_id}).")
        return JSONResponse(content={"status": "success"})

    # =========================================================
    # X) INVOICE FINALIZATION FAILED (pas de PM → invoice reste "draft")
    # =========================================================
    if evt_type == "invoice.finalization_failed":
        invoice = event["data"]["object"]
        sub_id = invoice.get("subscription")
        pay_url = invoice.get("hosted_invoice_url") or f"{FRONTEND_URL}/billing"

        users = json.loads(USERS_JSON_PATH.read_text(encoding="utf-8")) if USERS_JSON_PATH.exists() else {}

        user_id = None
        for uid, u in users.items():
            sub = (u.get("subscription") or {})
            if sub.get("stripe_subscription_id") == sub_id:
                user_id = uid
                break

        if not user_id:
            logger.warning("⚠️ invoice.finalization_failed: user introuvable pour cette subscription.")
            return JSONResponse(content={"status": "ignored"})

        # 1) Statut past_due + journal
        mark_subscription_payment_failed(user_id, reason="invoice.finalization_failed")

        # 2) Démarrer la période de grâce
        try:
            from app.models.users import start_grace_period
            try:
                start_grace_period(user_id, days=7)
            except TypeError:
                pass
        except Exception:
            pass

        # 3) Sauver un lien de paiement
        try:
            u = users[user_id]
            sub = u.setdefault("subscription", {})
            sub["pay_url"] = pay_url
            USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")
        except Exception as _e:
            logger.warning(f"[pay_url@finalization_failed] KO: {_e}")

        # 4) 📧 Email d’échec — une seule fois (finalization_failed)
        try:
            u = users[user_id]
            sub = u.setdefault("subscription", {})
            if not sub.get("failed_mail_sent"):
                user_email = u.get("email")
                if user_email:
                    send_email_html(
                        user_email,
                        subscription_failed_subject(),
                        subscription_failed_html(pay_url),
                        subscription_failed_text(pay_url)
                    )
                    sub["failed_mail_sent"] = True
                    USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")
                    logger.info("📧 Email d'échec (finalization_failed) envoyé (unique).")
        except Exception as _e:
            logger.warning(f"[email@finalization_failed] KO: {_e}")

        return JSONResponse(content={"status": "success"})

    # =========================================================
    # Y) CUSTOMER SUBSCRIPTION UPDATED (statut passe à past_due/unpaid/active/canceled)
    # =========================================================
    if evt_type == "customer.subscription.updated":
        sub_obj = event["data"]["object"]
        sub_id = sub_obj.get("id")
        status = sub_obj.get("status")  # 'active' | 'past_due' | 'unpaid' | 'canceled' | ...

        users = json.loads(USERS_JSON_PATH.read_text(encoding="utf-8")) if USERS_JSON_PATH.exists() else {}

        user_id = None
        for uid, u in users.items():
            s = (u.get("subscription") or {})
            if s.get("stripe_subscription_id") == sub_id:
                user_id = uid
                break

        if not user_id:
            return JSONResponse(content={"status": "ignored"})

        if status in ("past_due", "unpaid"):
            mark_subscription_payment_failed(user_id, reason=f"subscription.updated:{status}")
            # (optionnel) start_grace_period déjà fait ailleurs
            try:
                from app.models.users import start_grace_period
                try:
                    start_grace_period(user_id, days=7)
                except TypeError:
                    pass
            except Exception:
                pass

        if status == "canceled":
            try:
                from app.models.users import cancel_subscription
                cancel_subscription(user_id)
            except Exception:
                u = users[user_id]
                s = u.setdefault("subscription", {})
                s["active"] = False
                s["status"] = "canceled"
                s["canceled_at"] = sub_obj.get("canceled_at") or sub_obj.get("ended_at")
                USERS_JSON_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")

        return JSONResponse(content={"status": "success"})

    # Événements non gérés -> OK (idempotent / future-proof)
    return JSONResponse(content={"status": "ignored"})

