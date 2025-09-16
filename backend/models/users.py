# backend/models/users.py
# =======================
# 📌 Gestion des utilisateurs dans Stratify.
#
# - Définition du modèle Pydantic `User`
# - Fonctions utilitaires pour lire/écrire dans `users.json`
# - Gestion des crédits, abonnements et historique d'achat
# - Suppression et mise à jour de comptes
#
# ⚠️ Attention : les mots de passe sont stockés en clair (à sécuriser
# plus tard avec du hashing type bcrypt).
from backend.core.paths import USERS_JSON  # ← la DB sur le disque

import json
from pathlib import Path as _Path
from pathlib import Path
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from backend.models.offers import get_offer_by_id
import json

# 📂 Chemin du fichier JSON qui fait office de "base de données" utilisateurs
USERS_FILE = USERS_JSON
AUDIT_FILE = _Path("backend/data/audit/ledger.jsonl")
AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)  # ✅ crée le dossier si absent
def _audit_append(evt: dict):
    try:
        evt = dict(evt)
        evt.setdefault("ts", datetime.utcnow().isoformat())
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            import json as _json
            f.write(_json.dumps(evt, ensure_ascii=False) + "\n")
    except Exception:
        pass


# 🧑‍💻 Modèle Pydantic pour représenter un utilisateur
class User(BaseModel):
    id: str                   # ID unique (souvent généré par UUID)
    username: str             # Nom d’utilisateur choisi
    email: str                # Adresse email
    first_name: str = ""      # Prénom optionnel
    last_name: str = ""       # Nom optionnel
    password: str             # Mot de passe (⚠️ en clair)
    credits: int = 0          # Crédits disponibles
    plan: str = "free"        # Plan actuel ("free", "subscription", etc.)
    purchase_history: list = []   # Liste des achats (crédits, abonnements…)
    subscription: dict = {}       # Détails de l’abonnement si actif
    priority_backtest: bool = False   # Indique si le user a priorité sur les backtests
    has_discount: bool = False        # Indique si le user bénéficie de -10%


# 🔍 Récupérer un utilisateur à partir de son token d’authentification
def get_user_by_token(token: str) -> User | None:
    if not USERS_FILE.exists():
        return None
    with open(USERS_FILE) as f:
        users = json.load(f)

    # Parcours de tous les utilisateurs et comparaison du token
    for user_id, data in users.items():
        if data.get("token") == token:
            return User(id=user_id, **data)
    return None


# ➖ Décrémenter les crédits d’un utilisateur
def decrement_credits(user_id, amount=1):
    """
    Retire un certain nombre de crédits à l’utilisateur.
    Erreur si crédits insuffisants ou utilisateur inconnu.
    """
    with open(USERS_FILE, "r+") as f:
        users = json.load(f)
        if user_id in users and users[user_id]["credits"] >= amount:
            users[user_id]["credits"] -= amount
            # Réécriture complète du JSON
            f.seek(0)
            json.dump(users, f, indent=2)
            f.truncate()
        else:
            raise ValueError("Insufficient credits or unknown user")


# ⚠️ On CONSERVE la signature existante pour éviter toute régression
def update_user(user_id: str, email: str | None = None,
                full_name: str | None = None,
                password: str | None = None) -> bool:
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False

    # email
    if email is not None and str(email).strip():
        u["email"] = str(email).strip()

    # password (si envoyé en clair ici; sinon garde tel quel si déjà hashé en amont)
    if password:
        u["password"] = password if str(password).startswith("$2") else pwd_context.hash(password)

    # full_name : on le persiste VRAIMENT + on tient à jour les champs utiles à l'UI
    if full_name is not None:
        fn = str(full_name).strip()
        u["full_name"] = fn or None
        u["name"] = fn or None   # beaucoup d'UI lisent 'name'

        # Si ton users.json possède déjà first_name / last_name, on les alimente aussi
        # (sinon no-op, ça n'introduit pas de régression)
        parts = fn.split()
        first = parts[0] if parts else None
        last  = " ".join(parts[1:]) if len(parts) > 1 else None
        if "first_name" in u: u["first_name"] = first
        if "last_name"  in u: u["last_name"]  = last

    _atomic_write_json(USERS_FILE, users)
    return True



# ❌ Supprimer un utilisateur
def delete_user_by_id(user_id: str) -> bool:
    """
    Supprime complètement l’utilisateur (par ID) du fichier JSON,
    en ARCHIVANT d'abord son historique dans le ledger immuable.
    """
    if not USERS_FILE.exists():
        return False
    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        u = users.get(user_id)
        if not u:
            return False

        # 1) archiver son historique d'achats/backtests (si présent)
        for tx in (u.get("purchase_history") or []):
            _audit_append({"type": "tx", "user_id": user_id, "data": tx})

        # 2) événement de suppression
        _audit_append({"type": "user_deleted", "user_id": user_id})

        # 3) suppression effective
        del users[user_id]
        f.seek(0)
        json.dump(users, f, indent=2, ensure_ascii=False)
        f.truncate()
        return True

# 💳 Mettre à jour un utilisateur après un paiement
def update_user_after_payment(user_id: str, offer_id: str, method: str = "unknown", order_id: str = None):
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

        offer = get_offer_by_id(offer_id)
        if not offer:
            return False

        user = users[user_id]
        price = offer["price_eur"]
        discount_str = "0%"
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
        if offer["type"] == "one_shot":
            base_credits = offer["credits"]
            bonus = round(base_credits * 0.10) if discount_str == "10%" else 0
            total_credits = base_credits + bonus
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
            "discount_applied": discount_str
        }
        if method == "PayPal" and order_id:
            tx["order_id"] = order_id

        user.setdefault("purchase_history", []).append(tx)

        f.seek(0)
        json.dump(users, f, indent=2)
        f.truncate()
    return True

# 🚫 Annuler l’abonnement d’un utilisateur
def cancel_subscription(user_id: str) -> bool:
    """
    Met fin à l’abonnement :
    - repasse le plan sur 'free'
    - supprime les avantages (priorité, réduction)
    """
    if not USERS_FILE.exists():
        return False
    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        if user_id not in users:
            return False

        user = users[user_id]
        user["plan"] = "free"
        user["subscription"] = {
            "type": None,
            "start_date": None,
            "renew_date": None,
            "active": False
        }
        user["priority_backtest"] = False
        user["has_discount"] = False

        f.seek(0)
        # log immuable
        _audit_append({"type": "subscription_cancelled", "user_id": user_id})
        json.dump(users, f, indent=2)
        f.truncate()
       
    return True
# backend/models/users.py
from pathlib import Path
import json, tempfile, os
from passlib.context import CryptContext

USERS_FILE = Path("backend/database/users.json")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _load_users() -> dict:
    if not USERS_FILE.exists():
        return {}
    try:
        raw = USERS_FILE.read_text(encoding="utf-8")
        return json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        return {}

def _atomic_write_json(path: Path, data: dict) -> None:
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try: os.remove(tmp)
            except: pass

# BACKTRADZ 2025-09-07: last_seen pour activité (comptage "connectés")

def update_last_seen(user_id: str) -> None:
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return
    # On stocke en UTC+02 pour cohérence affichage admin
    u["last_seen"] = datetime.now(timezone(timedelta(hours=2))).isoformat()
    _atomic_write_json(USERS_FILE, users)


# BACKTRADZ 2025-09-07: débit backtest (−2 credits) + journalisation user/admin

def charge_2_credits_for_backtest(user_id: str, meta: dict | None = None) -> dict:
    """
    Débite 2 crédits pour un backtest et ajoute une entrée d'historique.
    Persiste TOUTES les métadonnées (dont duration_ms) pour alimenter les analytics.
    """
    users = _load_users()
    u = users.get(user_id)
    if not u:
        raise ValueError("Utilisateur introuvable")

    u.setdefault("credits", 0)
    u.setdefault("purchase_history", [])

    if int(u["credits"]) < 2:
        raise ValueError("Crédits insuffisants")

    # Débit
    u["credits"] = int(u["credits"]) - 2

    meta = meta or {}
    # libellé par défaut lisible, surchargeable par meta["label"]
    default_label = "Backtest exécuté (-2 credits)"
    label = str(meta.get("label") or default_label)

    # TX de base
    tx = {
        "date": datetime.now(timezone(timedelta(hours=2))).isoformat(),  # UTC+02 pour affichage
        "type": "backtest",
        "method": "credits",
        "price_paid": -2,          # reste pour l'historique
        "credits_delta": -2,       # utile pour credits_flow
        "label": label,
    }

    # 🔁 Merge TOUTES les métadonnées fournies (symbol, timeframe, strategy, period, folder, duration_ms, …)
    for k, v in meta.items():
        tx[k] = v

    # Normalisations douces
    # duration_ms / elapsed_ms / duration_s -> on garde duration_ms si possible
    if "duration_ms" in tx and tx["duration_ms"] is not None:
        try:
            tx["duration_ms"] = int(float(tx["duration_ms"]))
        except Exception:
            pass
    elif "elapsed_ms" in tx and tx["elapsed_ms"] is not None:
        try:
            tx["duration_ms"] = int(float(tx["elapsed_ms"]))
        except Exception:
            pass
    elif "duration_s" in tx and tx["duration_s"] is not None and "duration_ms" not in tx:
        try:
            tx["duration_ms"] = int(float(tx["duration_s"]) * 1000.0)
        except Exception:
            pass

    # Ajout à l'historique + persistance
    u["purchase_history"].append(tx)
    _atomic_write_json(USERS_FILE, users)
    return tx




def grant_signup_bonus(user_id: str) -> bool:
    """
    Attribue +2 crédits une seule fois à l'utilisateur (user_id = token),
    et log l'opération dans purchase_history.

    Retour:
      True si le bonus a été attribué à cet appel,
      False si déjà attribué ou utilisateur introuvable.
    """
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False

    # Idempotence : ne pas ré-attribuer si déjà fait
    if u.get("signup_bonus_granted") is True:
        return False

    # Sécurise la structure
    u.setdefault("credits", 0)
    u.setdefault("purchase_history", [])

    # Applique le bonus
    u["credits"] = int(u["credits"]) + 2
    u["signup_bonus_granted"] = True

    # Journalisation (visible user + admin)
    # BACKTRADZ 2025-09-07: libellé explicite + TZ Europe/Brussels (UTC+02)

    u["purchase_history"].append({
        "label": "Bonus inscription (+2 credits)",  # ⬅️ ASCII only, plus de bug
        "type": "bonus",
        "method": "offert",
        "credits_added": 2,
        "price_paid": 0,
        "discount_applied": "100%",
        "date": datetime.now(timezone(timedelta(hours=2))).isoformat()
    })



    _atomic_write_json(USERS_FILE, users)
    return True


# --- EMAIL VERIFICATION (Phase 1) -------------------------------------------
import uuid
from datetime import datetime, timezone, timedelta

def init_email_verification(user_id: str, pending_bonus: int = 2) -> str:
    """
    Initialise la vérification email pour un user :
    - email_verified = False
    - pending_bonus_credits_on_verify = pending_bonus (par défaut 2)
    - email_verification_token = UUID opaque
    - email_verification_sent_at = now (UTC+02 pour cohérence visuelle)
    Retourne le token de vérif (à mettre dans l’URL côté front).
    """
    users = _load_users()
    u = users.get(user_id)
    if not u:
        raise ValueError("Utilisateur introuvable")

    u.setdefault("email_verified", False)
    u.setdefault("pending_bonus_credits_on_verify", int(pending_bonus))
    u["email_verification_token"] = str(uuid.uuid4())
    u["email_verification_sent_at"] = datetime.now(timezone(timedelta(hours=2))).isoformat()
    _atomic_write_json(USERS_FILE, users)
    return u["email_verification_token"]

def get_user_id_by_verification_token(token: str) -> str | None:
    """Retourne le user_id (clé) associé à un token de vérif, ou None."""
    users = _load_users()
    for uid, u in users.items():
        if u.get("email_verification_token") == token:
            return uid
    return None

def mark_email_verified_and_grant_pending_bonus(user_id: str) -> bool:
    """
    Marque l’email comme vérifié et crédite le bonus 'pending' une seule fois.
    Idempotent : si déjà vérifié ou bonus déjà consommé → False.
    """
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False

    # déjà vérifié → rien à faire
    if u.get("email_verified") is True:
        return False

    # ✅ vérifie qu’on a bien un bonus en attente (par défaut 2) et pas déjà donné
    pending = int(u.get("pending_bonus_credits_on_verify") or 0)
    already_granted = bool(u.get("signup_bonus_granted") is True)

    u["email_verified"] = True
    u["email_verification_token"] = None

    if pending > 0 and not already_granted:
        u.setdefault("credits", 0)
        u["credits"] = int(u["credits"]) + pending
        u["signup_bonus_granted"] = True  # on réutilise le flag existant pour l’idempotence
        u.setdefault("purchase_history", []).append({
            "label": f"Bonus vérification email (+{pending} credits)",
            "type": "bonus",
            "method": "offert",
            "credits_added": pending,
            "price_paid": 0,
            "discount_applied": "100%",
            "date": datetime.now(timezone(timedelta(hours=2))).isoformat()
        })
        u["pending_bonus_credits_on_verify"] = 0

    _atomic_write_json(USERS_FILE, users)
    return True


def activate_subscription_without_credits(user_id: str, offer_id: str, provider: str = "stripe",
                                          stripe_customer_id: str | None = None,
                                          stripe_subscription_id: str | None = None) -> bool:
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False

    offer = get_offer_by_id(offer_id)
    if not offer:
        return False

    now = datetime.utcnow()
    u["plan"] = offer_id
    u["subscription"] = {
        "type": offer_id,
        "start_date": now.isoformat(),
        "renew_date": (now + timedelta(days=offer.get("duration_days", 30))).isoformat(),
        "active": True,
        "provider": provider,
        "stripe_customer_id": stripe_customer_id,
        "stripe_subscription_id": stripe_subscription_id,
        "status": "active",
    }
    u["priority_backtest"] = offer.get("priority_backtest", False)
    u["has_discount"] = offer.get("discount_rate", 0) > 0

    _atomic_write_json(USERS_FILE, users)
    return True


def add_monthly_credits_after_invoice_paid(user_id: str, offer_id: str, billing_reason: str | None = None) -> bool:
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False
    offer = get_offer_by_id(offer_id)
    if not offer:
        return False

    monthly = int(offer.get("credits_monthly", 0))
    if monthly <= 0:
        return False

    now = datetime.utcnow()
    u.setdefault("credits", 0)
    u["credits"] = int(u["credits"]) + monthly

    # Mise à jour d'état abo (inchangé)
    u.setdefault("subscription", {}).update({
        "renew_date": (now + timedelta(days=offer.get("duration_days", 30))).isoformat(),
        "last_payment_status": "paid",
        "status": "active",
        "active": True,
    })

    # 🔥 Transaction de renouvellement (changement MINIMAL ici)
    tx = {
        "label": "Crédits mensuels",
        "credits_added": monthly,
        # ✅ on log le vrai prix pour les KPI/détails (au lieu de 0)
        "price_paid": float(offer.get("price_eur") or 0),
        "price_eur":  float(offer.get("price_eur") or 0),   # <- pour les lecteurs qui préfèrent price_eur
        "date": now.isoformat(),
        "method": "stripe",                                # on garde "renewal" pour ne rien casser
        "type": "purchase",                                 # <- aide les tableaux "Ventes"
        "discount_applied": "auto",
        "billing_reason": billing_reason or "subscription"
    }

    u.setdefault("purchase_history", []).append(tx)
    _atomic_write_json(USERS_FILE, users)
    return True


def mark_subscription_payment_failed(user_id: str, reason: str | None = None) -> bool:
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False

    sub = u.setdefault("subscription", {})
    sub["active"] = False
    sub["status"] = "past_due"
    sub["last_payment_status"] = "failed"
    sub["last_payment_error"] = (reason or "")[:300]

    u.setdefault("purchase_history", []).append({
        "label": "Paiement d’abonnement échoué",
        "credits_added": 0,
        "price_paid": 0,
        "date": datetime.utcnow().isoformat(),
        "method": "renewal",
        "discount_applied": "n/a",
        "error": sub["last_payment_error"],
    })
    _atomic_write_json(USERS_FILE, users)
    return True

# --- Grace period helpers (ADD) ---------------------------------------------
from datetime import datetime, timedelta, timezone

def start_grace_period(user_id: str, days: int = 7) -> bool:
    """
    Démarre une période de grâce (par défaut 7 jours) après un échec de paiement.
    Ne coupe rien : on marque juste les dates/flags.
    """
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False
    sub = u.setdefault("subscription", {})
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    sub["status"] = "past_due"                  # déjà posé ailleurs, on renforce
    sub["active"] = False                       # pas d'avantages abo tant que non payé
    sub["grace_started_at"] = now.isoformat()   # ISO UTC
    sub["grace_days"] = max(1, int(days))
    _atomic_write_json(USERS_FILE, users)
    return True

def clear_grace_period(user_id: str) -> bool:
    """
    Efface les infos de grâce (après paiement réussi).
    """
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False
    sub = u.setdefault("subscription", {})
    sub.pop("grace_started_at", None)
    sub.pop("grace_days", None)
    sub["status"] = "active"
    sub["active"] = True
    _atomic_write_json(USERS_FILE, users)
    return True

def compute_grace_info(u: dict) -> dict:
    """
    Calcule { in_grace, grace_deadline, grace_days_left } à partir des champs stockés.
    Renvoie des valeurs sûres (pas d'exception) même si les champs sont manquants.
    """
    try:
        sub = (u.get("subscription") or {})
        started = sub.get("grace_started_at")
        days = int(sub.get("grace_days", 0) or 0)
        if not started or days <= 0:
            return {"in_grace": False, "grace_deadline": None, "grace_days_left": 0}
        dt = datetime.fromisoformat(started.replace("Z", "+00:00"))
        deadline = dt + timedelta(days=days)
        now = datetime.utcnow().replace(tzinfo=dt.tzinfo)
        left = (deadline - now).days
        return {
            "in_grace": now < deadline,
            "grace_deadline": deadline.isoformat(),
            "grace_days_left": max(0, left)
        }
    except Exception:
        return {"in_grace": False, "grace_deadline": None, "grace_days_left": 0}

# --- Stripe cancel helper (ADD, sans régression) ----------------------------
import os
import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def cancel_stripe_subscription(user_id: str, at_period_end: bool = True) -> bool:
    """
    Annule l'abonnement Stripe puis met à jour l'état local via cancel_subscription(...).
    - at_period_end=True  → résiliation à échéance (recommandé par défaut)
    - at_period_end=False → annulation immédiate (prorata selon paramètres du compte)
    """
    users = _load_users()
    u = users.get(user_id)
    if not u:
        return False

    sub = (u.get("subscription") or {})
    sub_id = sub.get("stripe_subscription_id")
    if not sub_id:
        # Pas d'abo Stripe connu → on annule juste localement
        return cancel_subscription(user_id)

    try:
        if at_period_end:
            stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
        else:
            stripe.Subscription.delete(sub_id)
    except Exception as e:
        print(f"[Stripe cancel] {sub_id} error: {e}")
        return False

    # Màj locale (réutilise ta fonction existante)
    return cancel_subscription(user_id)

