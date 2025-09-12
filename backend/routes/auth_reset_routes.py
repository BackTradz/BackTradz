# auth_reset_routes.py
from fastapi import APIRouter, Request, HTTPException
from pathlib import Path
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import uuid, json, os, tempfile
from backend.utils.email_sender import send_email_html
from backend.utils.email_templates import (
    reset_subject, reset_html, reset_text
)



router = APIRouter()
USERS_FILE = Path("backend/database/users.json")
RESET_FILE = Path("backend/database/reset_tokens.json")
RESET_FILE.parent.mkdir(parents=True, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# -- utils JSON (écriture atomique pour éviter toute corruption) -------------
def _load_json(path: Path) -> dict:
    if not path.exists(): return {}
    try:
        raw = path.read_text(encoding="utf-8")
        return json.loads(raw) if raw.strip() else {}
    except Exception:
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

def _purge_expired(tokens: dict) -> int:
    now = datetime.now(timezone.utc)
    to_del = []
    for k, v in tokens.items():
        try:
            exp = v.get("exp")
            if exp and now > datetime.fromisoformat(exp):
                to_del.append(k)
        except Exception:
            to_del.append(k)
    for k in to_del:
        tokens.pop(k, None)
    return len(to_del)

def _hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

@router.post("/generate-reset-token")
async def generate_reset_token(request: Request):
    """
    Génère un token de reset (validité 2h), le stocke dans reset_tokens.json
    et envoie un e-mail avec le lien /reset-password/<token> côté FRONT.
    Réponse générique (anti enumeration).
    """
    try:
        data = await request.json()
    except Exception:
        data = {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email requis.")

    users = _load_json(USERS_FILE)
    # users.json => { user_token: {..., email: "..." } }
    user_token = next((ut for ut, u in users.items()
                       if str(u.get("email", "")).strip().lower() == email), None)

    # on répond toujours success côté client pour éviter l'énumération des comptes
    reset_token = None
    emailed = False

    if user_token:
        tokens = _load_json(RESET_FILE)
        _purge_expired(tokens)

        reset_token = str(uuid.uuid4())
        exp = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        tokens[reset_token] = {"user_token": user_token, "exp": exp}
        _atomic_write_json(RESET_FILE, tokens)

        # lien FRONT
        frontend = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        reset_url = f"{frontend}/reset-password/{reset_token}"

        # email simple (dark) — tu peux le styler plus tard

        subject = reset_subject()
        html    = reset_html(reset_url)
        text    = reset_text(reset_url)
        try:
            emailed = send_email_html(email, subject, html, text)
        except Exception:
            emailed = False

    return {"status": "success", "emailed": bool(emailed), "reset_token": reset_token}

@router.post("/reset-password/{reset_token}")
async def reset_password(reset_token: str, request: Request):
    """
    Vérifie le token, remplace le mot de passe par un hash bcrypt, puis purge
    le token (et les éventuels autres du même user).
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    new_password = str(data.get("new_password") or "")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (min. 8).")

    tokens = _load_json(RESET_FILE)
    entry = tokens.get(reset_token)
    if not entry:
        # compat legacy
        entry = next((v for k, v in tokens.items()
                      if k == reset_token or v.get("user_token") == reset_token), None)
    if not entry:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré.")

    # expiration
    try:
        exp_dt = datetime.fromisoformat(entry.get("exp"))
        if datetime.now(exp_dt.tzinfo) > exp_dt:
            # purge tokens de ce user et refuse
            utok = entry.get("user_token")
            for k in [k for k, v in tokens.items() if v.get("user_token") == utok]:
                tokens.pop(k, None)
            _atomic_write_json(RESET_FILE, tokens)
            raise HTTPException(status_code=400, detail="Token expiré.")
    except Exception:
        tokens.pop(reset_token, None)
        _atomic_write_json(RESET_FILE, tokens)
        raise HTTPException(status_code=400, detail="Token invalide ou expiré.")

    utok = entry["user_token"]
    users = _load_json(USERS_FILE)
    if utok not in users:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    users[utok]["password"] = _hash_password(new_password)
    _atomic_write_json(USERS_FILE, users)

    # purge de tous les tokens de ce user
    tokens.pop(reset_token, None)
    for k in [k for k, v in tokens.items() if v.get("user_token") == utok]:
        tokens.pop(k, None)
    _atomic_write_json(RESET_FILE, tokens)

    return {"status": "success", "message": "Mot de passe réinitialisé avec succès."}
