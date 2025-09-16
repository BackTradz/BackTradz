"""
File: backend/routes/user_routes.py
Role: Routes génériques liées à l'utilisateur (profil, enregistrement).
Depends:
  - backend.auth.get_current_user
  - backend.models.users (update_user)
  - backend/database/users.json (stockage)
Side-effects:
  - Lecture/écriture du JSON utilisateurs
Security:
  - /me et /profile/update protégés via get_current_user
  - /register public (vérifie doublons)
Notes:
  - Les logs '🔄 UPDATE REQ' sont gardés pour debug.
"""
from backend.core.paths import USERS_JSON as USERS_FILE, DB_DIR, DATA_ROOT


from backend.utils.json_db import read_json, write_json_atomic, file_lock
from fastapi import APIRouter, Depends, Request
from backend.auth import get_current_user
from backend.models.users import User
from backend.models.users import update_user
from backend.models.users import grant_signup_bonus
from backend.models.users import update_last_seen, init_email_verification, get_user_by_token
from fastapi.responses import JSONResponse
#from fastapi_mail import FastMail, MessageSchema, ConnectionConfig  # si tu veux ajouter plus tard un vrai envoi d’email
from backend.utils.email_sender import send_email_html
from backend.utils.email_templates import verification_subject, verification_html, verification_text
from datetime import datetime
from backend.models.users import compute_grace_info  # ADD en haut du fichier si absent
from backend.models.users import cancel_stripe_subscription, cancel_subscription
from backend.models.offers import OFFERS

from pydantic import BaseModel, EmailStr, validator
import re, os, json, uuid, tempfile
from typing import Dict
from fastapi import Body, HTTPException
from passlib.exc import UnknownHashError

from pathlib import Path
from passlib.context import CryptContext
import uuid
import json

router = APIRouter()

RECREATE_FILE = (DB_DIR / "email_recreate.json")
RECREATE_FILE.parent.mkdir(parents=True, exist_ok=True)

def _load_json_safe(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        raw = path.read_text(encoding="utf-8")
        import json as _json
        return _json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}
    
# --- Ledger (audit) pour stats immuables ---
AUDIT_FILE = (DATA_ROOT / "audit" / "ledger.jsonl")
AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)

def _audit_append(evt: dict) -> None:
    # écriture append-only dans backend/data/audit/ledger.jsonl
    from datetime import datetime as _dt
    from pathlib import Path
    import json, os

    path = AUDIT_FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = dict(evt)
        data.setdefault("ts", _dt.utcnow().isoformat() + "Z")
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")
    except Exception:
        pass



# 🛡️ Configuration du hash (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    """
    Hash un mot de passe en utilisant bcrypt.
    """
    return pwd_context.hash(password)

def _abs_backend_url(request, path: str) -> str:
    base = str(request.base_url).rstrip("/")  # ex: http://127.0.0.1:8000
    return f"{base}{path}"

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    first = user.first_name or ""
    last  = user.last_name or ""
    full  = " ".join([p for p in [first, last] if p]).strip()

    # On lit l’état brut pour savoir si l’email est vérifié et combien de crédits sont en attente
    import json
    from pathlib import Path
    USERS_FILE = USERS_FILE
    email_verified = False
    pending_bonus = 0
    sub = dict(user.subscription or {})   
    try:
        raw = json.loads(USERS_FILE.read_text(encoding="utf-8")) if USERS_FILE.exists() else {}
        rec = raw.get(user.id) or {}
        email_verified = bool(rec.get("email_verified"))
        pending_bonus = int(rec.get("pending_bonus_credits_on_verify") or 0)

        # ✅ PREND L'ÉTAT DISQUE S’IL EXISTE (grace_started_at, grace_days, etc.)
        sub = dict((rec.get("subscription") or user.subscription) or {})
        gi = compute_grace_info({ "subscription": sub })
        sub["in_grace"] = gi["in_grace"]
        sub["grace_deadline"] = gi["grace_deadline"]
        sub["grace_days_left"] = gi["grace_days_left"]
    except Exception:
        pass
    
    def _looks_like_sub(tx: dict) -> bool:
        label  = str(tx.get("label") or "").lower()
        method = str(tx.get("method") or "").lower()
        reason = str(tx.get("billing_reason") or "").lower()
        return (method in {"renewal", "stripe"} or "subscription" in reason or "abonnement" in label)

    def _infer_offer_price(u_rec: dict, tx: dict) -> float | None:
        # prix d’abo attendu depuis OFFERS (SUB_9, SUB_25…)
        plan = ((u_rec.get("subscription") or {}).get("type")
                or u_rec.get("plan"))
        if not plan:
            return None
        offer = OFFERS.get(plan)
        if not offer or offer.get("type") != "subscription":
            return None
        return float(offer.get("price_eur") or 0)

    # --- enrichit l'historique pour l'affichage
    rec = raw  # déjà lu plus haut; sinon relis users.json
    u_rec = rec.get(user.id, {}) if isinstance(rec, dict) else {}
    hist = list((u_rec.get("purchase_history") if isinstance(u_rec, dict) else user.purchase_history) or [])

    enriched = []
    for tx in hist:
        t = dict(tx)
        # montant €
        price_eur = t.get("price_eur")
        if price_eur is None:
            p = t.get("price_paid")
            if isinstance(p, (int, float)) and p > 0:
                price_eur = float(p)
        if not isinstance(price_eur, (int, float)) or price_eur <= 0:
            # si abo → prix attendu (utile pour "paiement échoué")
            if _looks_like_sub(t):
                price_eur = _infer_offer_price(u_rec, t) or 0.0
            else:
                price_eur = float(price_eur or 0.0)

        # crédits ±
        credits_delta = t.get("credits_delta")
        if credits_delta is None:
            ca = t.get("credits_added")
            if isinstance(ca, (int, float)):
                credits_delta = float(ca)

        # texte joli pour l’UI
        amount = ""
        if isinstance(credits_delta, (int, float)) and credits_delta != 0:
            amount = f"{'+' if credits_delta > 0 else ''}{int(credits_delta)} crédits"
        elif isinstance(price_eur, (int, float)) and price_eur > 0:
            # achat / paiement (ou attendu pour un échec)
            is_failed = "échou" in str(t.get("label") or "").lower() or "failed" in str(t.get("status") or "").lower()
            amount = f"{'+' if not is_failed else ''}{int(price_eur)} €" + (" (échec)" if is_failed else "")

        t["price_eur"] = float(price_eur or 0)
        if credits_delta is not None:
            t["credits_delta"] = int(credits_delta)
        if amount:
            t["amount"] = amount

        enriched.append(t)

    # injecte la version enrichie dans la réponse


    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": full,
        "full_name": full,
        "credits": user.credits,
        "plan": user.plan,
        "purchase_history": enriched,
        "subscription": sub,
        "has_discount": user.has_discount,
        "email_verified": email_verified,
        "pending_bonus_credits_on_verify": pending_bonus,
    }


@router.post("/register")
async def register_user(request: Request):
    """
    📥 Inscription d'un nouvel utilisateur :
    - Vérifie les doublons (email / username).
    - Hash le mot de passe.
    - Génère un token unique.
    - Enregistre le tout dans users.json.
    """
    data = await request.json()
    email = (data.get("email") or "").strip().lower()
    username = data.get("username")
    password = data.get("password")  # ✅ Important : récupérer le mot de passe
    # 🔒 limite 3 créations par email
    counts = _load_json_safe(RECREATE_FILE)
    if int(counts.get(email, 0)) >= 3:
        return JSONResponse({"status": "error", "message": "Limite de recréation atteinte pour cet email."}, status_code=403)
    
    # Chargement des utilisateurs existants
    users = {}
    if USERS_FILE.exists():
        users = json.loads(USERS_FILE.read_text())

    # Vérification de doublons
    if any(u.get("email") == email or u.get("username") == username for u in users.values()):
        return JSONResponse({"status": "error", "message": "Email ou nom d’utilisateur déjà utilisé."}, status_code=400)

    # Création du token unique
    token = str(uuid.uuid4())

    # ✅ Hash du mot de passe
    hashed_pw = hash_password(password)

    # Création du profil utilisateur
    new_user = {
        "email": email,
        "username": username,
        "password": hashed_pw,
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "credits": 0,
        "token": token,
        "plan": "free",
        "purchase_history": [],
        "subscription": {
            "type": None,
            "start_date": None,
            "renew_date": None,
            "active": False
        },
        "priority_backtest": False,
        "has_discount": False
    }

        # Enregistrement
    users[token] = new_user
    USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")

    # ✅ incrémente le compteur de créations
    try:
        counts[email] = int(counts.get(email, 0)) + 1
        # réutilise ton helper plus bas si tu préfères; ici on écrit direct
        RECREATE_FILE.write_text(json.dumps(counts, indent=2), encoding="utf-8")
    except Exception:
        pass
    
    # --- Email verification with 60s cooldown (no change to users.py) ---
    emailed = False
    verify_token = None
    verify_path = None

    # Récupère l'état courant de l'utilisateur (pour lire token + sent_at)
    try:
        u = get_user_by_token(token)
    except Exception:
        u = None

    # Calcul cooldown
    # Calcul cooldown (tolérant dict / objet)
    can_send = True
    last_sent = None
    if u is not None:
        last_sent = (u.get("email_verification_sent_at") if isinstance(u, dict)
                    else getattr(u, "email_verification_sent_at", None))
    if last_sent:
        try:
            from datetime import datetime
            last_dt = datetime.fromisoformat(last_sent)
            delta = datetime.now(last_dt.tzinfo) - last_dt
            can_send = delta.total_seconds() >= 60
        except Exception:
            can_send = True

    # Si pas encore de token => première init (définit aussi sent_at)
    has_token = False
    if u is not None:
        has_token = (
            u.get("email_verification_token") if isinstance(u, dict)
            else bool(getattr(u, "email_verification_token", None))
        )

    if not has_token:
        verify_token = init_email_verification(token, pending_bonus=2)
    else:
        verify_token = (
            u["email_verification_token"] if isinstance(u, dict)
            else getattr(u, "email_verification_token")
        )

    # Envoi mail une seule fois si cooldown OK
    if can_send:
        try:
            verify_abs = _abs_backend_url(request, verify_path)
            subj = verification_subject()
            html = verification_html(verify_abs)
            text = verification_text(verify_abs)
            emailed = send_email_html(new_user["email"], subj, html, text)
            # NOTE: init_email_verification a déjà mis sent_at à "maintenant".
            # On n'appelle rien d'autre pour respecter ta contrainte "users.py inchangé".
        except Exception as e:
            print("[register] envoi email vérif KO:", e)

    # Réponse API : front a tout ce qu'il faut (emailed + verifyUrl fallback)
    return {
        "status": "success",
        "apiKey": token,
        "token": token,
        "verifyUrl": verify_path,
        "emailed": bool(emailed),
    }



# backend/routes/user_routes.py

@router.post("/profile/update")
async def update_profile(request: Request, user: User = Depends(get_current_user)):
    data = await request.json()
    email = data.get("email") or ""
    full_name = (data.get("full_name") or "").strip()
    password = data.get("password")

    # split full_name -> first/last
    parts = full_name.split()
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    # hash si fourni (optionnel, comme avant)
    hashed_pw = hash_password(password) if password else None

    success = update_user(
        user.id,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=hashed_pw
    )

    if not success:
        return JSONResponse(status_code=400, content={"message": "Erreur mise à jour"})
    return {"status": "success"}


class SetPasswordPayload(BaseModel):
    new_password: str
    current_password: str | None = None

@validator("new_password")
def _new_pwd_strength(cls, v: str) -> str:
    import re
    if len(v) < 8:
        raise ValueError("Mot de passe trop court (min. 8).")
    classes = sum(bool(re.search(p, v)) for p in [r"[A-Z]", r"[a-z]", r"\d", r"[^A-Za-z0-9]"])
    if classes < 2:
        raise ValueError("Mot de passe trop faible (mélange recommandé : MAJ/min/chiffres/spéciaux).")
    return v

@router.post("/profile/set-password")
async def set_password(payload: SetPasswordPayload, user: User = Depends(get_current_user)):
    """
    Définit ou change le mot de passe :
    - Si aucun mot de passe n'était défini (compte Google), on autorise le set direct.
    - Sinon, on exige current_password correct.
    """
    users = _load_users()
    u = users.get(user.id)
    if not u:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    stored = u.get("password") or ""

    # Si un mdp existe déjà -> vérifier current_password
    if stored:
        if not payload.current_password:
            return JSONResponse({"status": "error", "message": "Mot de passe actuel requis."}, status_code=400)
        try:
            looks_hash = isinstance(stored, str) and stored.startswith("$2")
            ok = pwd_context.verify(payload.current_password, stored) if looks_hash else (payload.current_password == stored)
        except UnknownHashError:
            ok = (payload.current_password == stored)
        if not ok:
            return JSONResponse({"status": "error", "message": "Mot de passe actuel invalide."}, status_code=400)

    # Set du nouveau mdp (toujours hashé)
    u["password"] = hash_password(payload.new_password)
    _atomic_write_json(USERS_FILE, users)

    return {"status": "success"}


# --- HELPERS SÛRS -----------------------------------------------------------
def _atomic_write_json(path: Path, data: dict) -> None:
    """
    Écrit le JSON de façon atomique pour éviter la corruption fichier :
    on écrit dans un tmp, puis on remplace le fichier final.
    """
    tmp_fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", text=True)
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, path)  # atomic si même FS
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

def load_users() -> dict:
    return read_json(USERS_FILE, {})

def save_users(users: dict) -> None:
    lock = DB_DIR / "users.json.lock"
    with file_lock(lock):
        write_json_atomic(USERS_FILE, users)

# --- SCHÉMA D’ENTRÉE / VALIDATION ------------------------------------------
class RegisterPayload(BaseModel):
    email: EmailStr
    username: str
    password: str
    first_name: str | None = None
    last_name: str | None = None

    @validator("username")
    def username_rules(cls, v: str) -> str:
        v2 = v.strip()
        # 3–32 chars, lettres/chiffres/_/-
        if not re.fullmatch(r"[A-Za-z0-9_\-]{3,32}", v2):
            raise ValueError("Nom d’utilisateur invalide (3–32 caractères alphanumériques, _ ou -).")
        return v2

    @validator("password")
    def password_rules(cls, v: str) -> str:
        # ≥8 et au moins 2 classes (MAJ/min/chiffres/spéciaux)
        if len(v) < 8:
            raise ValueError("Mot de passe trop court (min. 8 caractères).")
        classes = sum(bool(re.search(p, v)) for p in [r"[A-Z]", r"[a-z]", r"\d", r"[^A-Za-z0-9]"])
        if classes < 2:
            raise ValueError("Mot de passe trop faible (mélange recommandé : MAJ/min/chiffres/spéciaux).")
        return v

# --- ROUTE /register SÉCURISÉE ----------------------------------------------
@router.post("/register")
async def register_user(request: Request):
    """
    📥 Inscription d’un nouvel utilisateur.

    Sécurité & conformité :
      - Validation stricte (email/username/password) côté serveur.
      - Déduplication insensible à la casse (email & username).
      - Hash bcrypt du mot de passe (jamais de clair).
      - Écriture JSON atomique.
      - Réponse neutre (pas de fuite d’infos inutiles).
    Retour (succès) :
      { "status": "success", "apiKey": "<uuid>", "token": "<uuid>" }
    """
    try:
        payload = RegisterPayload(**(await request.json()))
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=400)

    email_norm = payload.email.strip().lower()
    # 🔒 limite 3 créations par email
    counts = _load_json_safe(RECREATE_FILE)
    if int(counts.get(email_norm, 0)) >= 3:
        return JSONResponse({"status": "error", "message": "Limite de recréation atteinte pour cet email."}, status_code=403)
    username_norm = payload.username.strip()

    users = _load_users()

    # Doublons insensibles à la casse
    for u in users.values():
        if (u.get("email", "").strip().lower() == email_norm) or \
           (u.get("username", "").strip().lower() == username_norm.lower()):
            return JSONResponse(
                {"status": "error", "message": "Email ou nom d’utilisateur déjà utilisé."},
                status_code=400
            )

    token = str(uuid.uuid4())
    hashed_pw = hash_password(payload.password)  # ✅ bcrypt via pwd_context du fichier

    new_user = {
        "email": email_norm,
        "username": username_norm,
        "password": hashed_pw,           # ⚠️ jamais stocker le clair
        "first_name": (payload.first_name or "").strip() or None,
        "last_name": (payload.last_name or "").strip() or None,
        "credits": 0,
        "token": token,
        "plan": "free",
        "purchase_history": [],
        "subscription": {
            "type": None,
            "start_date": None,
            "renew_date": None,
            "active": False
        },
        "priority_backtest": False,
        "has_discount": False
    }

    users[token] = new_user
    _atomic_write_json(USERS_FILE, users)

    # ✅ incrémente le compteur de créations
    try:
        counts[email_norm] = int(counts.get(email_norm, 0)) + 1
        RECREATE_FILE.write_text(json.dumps(counts, indent=2), encoding="utf-8")
    except Exception:
        pass
    
    # --- Email verification with 60s cooldown (no change to users.py) ---
    emailed = False
    verify_token = None
    verify_path = None

    # Récupère l'état courant de l'utilisateur (pour lire token + sent_at)
    try:
        u = get_user_by_token(token)
    except Exception:
        u = None

    # Calcul cooldown
    # Calcul cooldown (tolérant dict / objet)
    can_send = True
    last_sent = None
    if u is not None:
        last_sent = (u.get("email_verification_sent_at") if isinstance(u, dict)
                    else getattr(u, "email_verification_sent_at", None))
    if last_sent:
        try:
            from datetime import datetime
            last_dt = datetime.fromisoformat(last_sent)
            delta = datetime.now(last_dt.tzinfo) - last_dt
            can_send = delta.total_seconds() >= 60
        except Exception:
            can_send = True

    # Si pas encore de token => première init (définit aussi sent_at)
    has_token = False
    if u is not None:
        has_token = (
            u.get("email_verification_token") if isinstance(u, dict)
            else bool(getattr(u, "email_verification_token", None))
        )

    if not has_token:
        verify_token = init_email_verification(token, pending_bonus=2)
    else:
        verify_token = (
            u["email_verification_token"] if isinstance(u, dict)
            else getattr(u, "email_verification_token")
        )

    # Envoi mail une seule fois si cooldown OK
    if can_send:
        try:
            verify_abs = _abs_backend_url(request, verify_path)
            subj = verification_subject()
            html = verification_html(verify_abs)
            text = verification_text(verify_abs)
            emailed = send_email_html(new_user["email"], subj, html, text)
            # NOTE: init_email_verification a déjà mis sent_at à "maintenant".
            # On n'appelle rien d'autre pour respecter ta contrainte "users.py inchangé".
        except Exception as e:
            print("[register] envoi email vérif KO:", e)

    # Réponse API : front a tout ce qu'il faut (emailed + verifyUrl fallback)
    return {
        "status": "success",
        "apiKey": token,
        "token": token,
        "verifyUrl": verify_path,
        "emailed": bool(emailed),
    }


@router.post("/user/delete_account")
async def delete_own_account(request: Request, user: User = Depends(get_current_user)):
    """
    Suppression par l'utilisateur lui-même :
    - archive ses transactions dans le ledger (événements 'tx')
    - loggue 'user_deleted' dans le ledger
    - supprime l'entrée du users.json
    """
    users = _load_json_safe(USERS_FILE)
    uid = user.id
    if uid not in users:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # 1) archiver ses achats pour stats immuables
    for tx in (users[uid].get("purchase_history") or []):
        _audit_append({"type": "tx", "user_id": uid, "data": tx})

    # 2) event de suppression
    _audit_append({"type": "user_deleted", "user_id": uid})

    # 3) suppression effective
    try:
        del users[uid]
        USERS_FILE.write_text(json.dumps(users, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")

    return {"detail": "Compte supprimé."}

@router.post("/subscription/cancel")
async def cancel_my_subscription(request: Request, user: User = Depends(get_current_user)):
    """
    Désabonne l'utilisateur:
    - Si provider='stripe': annule chez Stripe puis met à jour localement
    - Sinon: annule seulement localement
    Body JSON: {"immediate": false}  # immediate=True => annulation immédiate
    """
    try:
        data = await request.json()
    except Exception:
        data = {}
    immediate = bool(data.get("immediate", False))

    # Tolérant objet/dict pour subscription
    sub = getattr(user, "subscription", None)
    if not sub:
        raise HTTPException(status_code=400, detail="Aucun abonnement actif.")

    provider = (sub.get("provider") if isinstance(sub, dict) else getattr(sub, "provider", None))
    if provider == "stripe":
        ok = cancel_stripe_subscription(user.id, at_period_end=(not immediate))
        if not ok:
            raise HTTPException(status_code=500, detail="Annulation Stripe impossible.")
    else:
        # ex: abo local non-Stripe
        if not cancel_subscription(user.id):
            raise HTTPException(status_code=500, detail="Annulation locale impossible.")

    return {"status": "success"}
