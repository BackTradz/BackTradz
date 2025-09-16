"""
File: auth.py (racine)
Role: Authentification classique (email/username + password) + OAuth Google.
Depends:
  - backend.models.users: User, get_user_by_token
  - Fichier JSON "backend/database/users.json" (stockage utilisateurs)
Side-effects:
  - Lecture/écriture du JSON utilisateurs.
Security:
  - Login classique compare le mot de passe en clair (TODO: hasher).
  - Deux mécanismes d'auth coexistent (header X-API-Key et cookie "token").
    TODO: unifier la stratégie (cookies httpOnly ou header), et ajouter rate-limit.
Notes:
  - Ne change pas la logique à ta demande: uniquement des commentaires/docstrings.
"""

from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import HTMLResponse 
from starlette.responses import RedirectResponse as StarletteRedirect
from fastapi.responses import RedirectResponse  # NOTE: non utilisé actuellement (peut être retiré plus tard)
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from starlette.config import Config
from pathlib import Path
from dotenv import load_dotenv
import uuid
import os
import json
from fastapi import Query, Depends
from backend.models.users import (
    User,                                  # ✅ besoin pour l’annotation
    get_user_by_token,                     # ✅ utilisé dans get_current_user / verify_api_key
    get_user_id_by_verification_token,
    mark_email_verified_and_grant_pending_bonus,
    init_email_verification,
)
from backend.utils.email_sender import send_email_html
from backend.utils.email_templates import verification_subject, verification_html, verification_text



from passlib.context import CryptContext

# --- PATCH auth.py (ajouts en haut des imports) ---
from passlib.exc import UnknownHashError



pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

def _looks_bcrypt(s: str) -> bool:
    return isinstance(s, str) and s.startswith("$2") and len(s) > 20


# === 🔐 Auth classique ===

def get_current_user(x_api_key: str = Header(None)) -> User:
    """
    Récupère l'utilisateur courant via un header `X-API-Key`.

    Args:
        x_api_key (str): jeton utilisateur transmis dans l'en-tête HTTP.

    Returns:
        User: utilisateur correspondant au token.

    Raises:
        HTTPException 401: si absence de token.
        HTTPException 403: si token invalide (utilisateur introuvable).

    Notes:
        - Ce mécanisme coexiste avec les cookies "token" (voir get_current_user_optional).
        - TODO sécurité: ajouter une rotation des tokens et un rate-limit sur les endpoints protégés.
    """
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Token manquant")
    user = get_user_by_token(x_api_key)
    if not user:
        raise HTTPException(status_code=403, detail="Utilisateur non trouvé (token invalide)")
    return user

def hash_password(password: str) -> str:
    """
    Hash le mot de passe avec bcrypt (stocké dans users.json).
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compare un mot de passe en clair avec son hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


@router.post("/login")
async def login_user(request: Request):
    """
    Auth classique par identifiant (email OU username) + password.

    Body JSON attendu:
        {
          "identifier": "<email ou username>",
          "password": "<mot de passe en clair>"
        }

    Retour:
        { "status": "success", "token": "<uuid_user>" }  ou  { "status":"error", "message":"..." }

    ⚠️ Sécurité:
        - Mots de passe stockés/validés en clair dans users.json.
        - TODO: remplacer par un hash (bcrypt/argon2) + salage, et invalider les anciens dumps.
    """
    data = await request.json()
    identifier = data.get("identifier")
    password = data.get("password")

    # ✅ Normaliser identifier (emails → lowercase, username → trim)
    identifier_norm = (identifier or "").strip()
    identifier_email = identifier_norm.lower()


    USERS_FILE = Path("backend/database/users.json")
    if not USERS_FILE.exists():
        return {"status": "error", "message": "Aucun utilisateur enregistré."}

    with open(USERS_FILE, "r", encoding="utf-8") as f:
        users_data = json.load(f)

    for token, user in users_data.items():
        stored = user.get("password", "")
        if not stored:
            continue  # compte OAuth sans mdp local

        email_norm = str(user.get("email") or "").strip().lower()
        username_norm = str(user.get("username") or "").strip()

        is_candidate = (email_norm == identifier_email or username_norm.lower() == identifier_norm.lower())

        if not is_candidate:
            continue

        match = False
        try:
            if _looks_bcrypt(stored):
                match = pwd_context.verify(password, stored)
            else:
                # compat clair → on compare en clair
                match = (password == stored)
        except UnknownHashError:
            # hash illisible → fallback clair
            match = (password == stored)

        if match:
            # 🔁 Migration automatique vers bcrypt si encore en clair
            if not _looks_bcrypt(stored):
                users_data[token]["password"] = pwd_context.hash(password)
                try:
                    with open(USERS_FILE, "w", encoding="utf-8") as wf:
                        json.dump(users_data, wf, indent=2)
                except Exception:
                    pass  # on n'empêche pas le login si l'écriture échoue
            return {
                "status": "success",
                "apiKey": token,   # ✅ attendu par ton front
                "token": token,    # ✅ on garde pour compatibilité
                "user": {
                    "email": user.get("email"),
                    "username": user.get("username"),
                    "first_name": user.get("first_name"),
                    "last_name": user.get("last_name"),
                    "plan": user.get("plan"),
                    "credits": user.get("credits"),
                }
            }


    return {"status": "error", "message": "Identifiants invalides."}

# === ✅ VÉRIFICATION API KEY CENTRALE ============================

async def verify_api_key(x_api_key: str = Header(...)):
    """
    Vérifie si le token dans `X-API-Key` est valide (présent dans users.json).
    À utiliser en dépendance dans toutes les routes sensibles.
    """
    user = get_user_by_token(x_api_key)
    if not user:
        raise HTTPException(status_code=403, detail="🔒 Clé API invalide ou expirée.")
    return True



# === 🌐 Google OAuth (clean) ===============================================


ROOT_DIR = Path(__file__).resolve().parents[1]   # backend/ → remonte à la racine du projet
load_dotenv(ROOT_DIR / ".env")                   # charge le .env racine

# .env
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")  # ex: http://127.0.0.1:8000/api/auth/google/callback
print("DEBUG GOOGLE_REDIRECT_URI =", GOOGLE_REDIRECT_URI)

# Authlib / OAuth
config = Config()
oauth = OAuth(config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    client_kwargs={"scope": "openid email profile"},
)

USERS_FILE = Path("backend/database/users.json")
USERS_FILE.parent.mkdir(parents=True, exist_ok=True)

# ✅ AJOUTER :
RECREATE_FILE = Path("backend/database/email_recreate.json")
RECREATE_FILE.parent.mkdir(parents=True, exist_ok=True)

def _load_json_safe(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        raw = path.read_text(encoding="utf-8")
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}

def _atomic_write_json(path: Path, data: dict) -> None:
    import tempfile, os
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try: os.remove(tmp)
            except: pass

@router.get("/auth/google")
async def auth_google(request: Request):
    """
    Démarre le flux OAuth Google.
    Redirige l'utilisateur vers Google.
    """
    if not GOOGLE_REDIRECT_URI:
        # Sécurise: évite un crash silencieux si l'ENV est manquant
        return StarletteRedirect(f"{FRONTEND_URL}/login?provider=google&error=missing_redirect_uri")
    return await oauth.google.authorize_redirect(
        request, GOOGLE_REDIRECT_URI, prompt="select_account"
    )


@router.get("/auth/google/callback")
async def auth_google_callback(request: Request):
    """
    Callback Google :
      - échange le code contre un token
      - récupère userinfo (email, prénom, nom)
      - crée l'utilisateur si nécessaire
      - redirige vers le front avec ?provider=google&token=API_KEY
    """
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo") or {}
        # (fallback possible si besoin)
        # user_info = await oauth.google.parse_id_token(request, token)

        email = user_info.get("email")
        email_norm = (email or "").strip().lower()
        first_name = user_info.get("given_name", "")
        last_name = user_info.get("family_name", "")

        if not email:
            return StarletteRedirect(f"{FRONTEND_URL}/login?provider=google&error=no_email")

        # --- lecture users.json tolérante
        users: dict = {}
        if USERS_FILE.exists():
            try:
                raw = USERS_FILE.read_text(encoding="utf-8")
                users = json.loads(raw) if raw.strip() else {}
            except json.JSONDecodeError:
                users = {}

        # --- utilisateur déjà existant → réutilise son token (clé du dict)
        for token_key, user in users.items():
            if str(user.get("email", "")).strip().lower() == email_norm:
             # ⛔️ AVANT: f"{FRONTEND_URL}/?provider=google&apiKey={token_key}"
                return StarletteRedirect(f"{FRONTEND_URL}/login?provider=google&apiKey={token_key}")


        # --- création d'un nouvel utilisateur
        # 🔒 Limite de 3 (créations) par adresse e-mail
        counts = _load_json_safe(RECREATE_FILE)
        if int(counts.get(email_norm, 0)) >= 3:
            return StarletteRedirect(f"{FRONTEND_URL}/login?provider=google&error=recreate_limit")

        new_token = str(uuid.uuid4())
        new_user = {
            "email": email_norm,
            "username": email.split("@")[0],
            "first_name": first_name,
            "last_name": last_name,
            "password": "",  # OAuth → pas de password local
            "credits": 0,
            "token": new_token,
            "plan": "free",
            "purchase_history": [],
            "subscription": {
                "type": None,
                "start_date": None,
                "renew_date": None,
                "active": False,
            },
            "priority_backtest": False,
            "has_discount": False,
        }
        users[new_token] = new_user

        # --- persistance (et on redirige quoi qu'il arrive)
        try:
            USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")
        except Exception:
            # on ne bloque pas la connexion si l'écriture échoue
            pass
        # ✅ Incrémente le compteur de créations pour cet email
        try:
            counts[email_norm] = int(counts.get(email_norm, 0)) + 1
            _atomic_write_json(RECREATE_FILE, counts)
        except Exception:
            pass
        
           # BACKTRADZ 2025-09-08: phase 1 implementation verif mail pour recevoir les token 
        try:
            # Assure un pending=2 si besoin (pour nouveaux comptes)
            init_email_verification(new_token, pending_bonus=2)
            mark_email_verified_and_grant_pending_bonus(new_token)
        except Exception as e:
            print("[google-callback] verify+bonus error:", e)

        # Redirection front comme avant (pas de verifyToken nécessaire désormais)
            return StarletteRedirect(f"{FRONTEND_URL}/login?provider=google&apiKey={new_token}")
            
    except Exception as e:
        # En cas d'erreur globale → retour sur /login avec message
        # (ne surtout pas renvoyer une variable non définie)
        msg = str(e).replace(" ", "+")
        return StarletteRedirect(
            f"{FRONTEND_URL}/login?provider=google&error={msg}"
        )


async def get_current_user_optional(request: Request) -> dict | None:
    """
    Variante "optionnelle" : tente de récupérer un user via cookie "token".
    Retourne None si pas de cookie ou utilisateur introuvable.

    Notes:
      - Utile pour pages qui peuvent être publiques mais s'adapter si l'user est connecté.
      - TODO: sécuriser le stockage du token en cookie (httpOnly, SameSite, Secure) en prod.
    """
    token = request.cookies.get("token")
    # print("🔥 get_current_user_optional CALLED")  # debug possible
    # print("🔥 token =", token)  # debug possible

    if not token:
        return None

    user = get_user_by_token(token)  # recherche via token (ton implémentation)
    if not user:
        return None

    return user


@router.get("/auth/verify-email")
async def verify_email(token: str = Query(..., description="Token de vérification reçu")):
    uid = get_user_id_by_verification_token(token)
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173")

    if not uid:
        target = f"{frontend}/profile?verified=error"
    else:
        changed = mark_email_verified_and_grant_pending_bonus(uid)
        flag = "1" if changed else "0"
        target = f"{frontend}/profile?verified={flag}"

    html = f"""<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<title>Redirection…</title>
<meta http-equiv="refresh" content="0; url={target}">
<style>body{{background:#0b1220;color:#e6f0ff;font-family:system-ui,Segoe UI,Roboto,Arial}}.wrap{{max-width:640px;margin:12vh auto;padding:24px;border:1px solid #22304a;border-radius:16px;background:#121a2b}}</style>
</head><body>
<div class="wrap">
  <h1>Redirection…</h1>
  <p>Si vous n’êtes pas redirigé automatiquement, <a href="{target}">cliquez ici</a>.</p>
</div>
<script>try{{window.location.replace("{target}");}}catch(e){{window.location="{target}";}}</script>
</body></html>"""
    return HTMLResponse(content=html, status_code=200)

@router.post("/auth/resend-verification")
async def resend_verification(user: User = Depends(get_current_user), request: Request = None):
    """
    Renvoie un email de vérification (cooldown 15s). Régénère un token propre.
    """
    try:
        # Cooldown 15s basé sur email_verification_sent_at
        can_send = True
        u = get_user_by_token(user.id)
        # Tolérant: dict OU objet User
        last_sent = None
        if u is not None:
            last_sent = (u.get("email_verification_sent_at") if isinstance(u, dict)
                         else getattr(u, "email_verification_sent_at", None))
        if last_sent:
            from datetime import datetime
            last_dt = datetime.fromisoformat(last_sent)
            delta = datetime.now(last_dt.tzinfo) - last_dt
            can_send = delta.total_seconds() >= 15

        # Régénère un token et met à jour sent_at via init()
        pending = int(getattr(user, "pending_bonus_credits_on_verify", 2) or 2)
        vt = init_email_verification(user.id, pending_bonus=pending)  # garde ta fonction telle quelle
        verify_path = f"/api/auth/verify-email?token={vt}"
        verify_abs  = str(request.base_url).rstrip("/") + verify_path

        emailed = False
        if can_send:
            subj = verification_subject()
            html = verification_html(verify_abs)
            text = verification_text(verify_abs)
            emailed = send_email_html(user.email, subj, html, text)

        return {"status": "success", "verifyUrl": verify_abs, "emailed": bool(emailed)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

