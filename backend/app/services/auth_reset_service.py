"""
File: backend/app/services/auth_reset_service.py
Role: Regroupe la logique utilitaire pour le reset de mot de passe :
      - chemins/JSON (lecture/écriture atomique)
      - purge des tokens expirés
      - hash du nouveau mot de passe (bcrypt)
Security: La protection (admin/public) reste côté routes. Ici, uniquement la logique.
Side-effects: lecture/écriture sur disque (reset_tokens.json, users.json).
"""

from pathlib import Path
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import uuid, json, os, tempfile

from app.core.paths import DB_DIR

# Fichier de stockage des tokens de reset
RESET_FILE = DB_DIR / "reset_tokens.json"
RESET_FILE.parent.mkdir(parents=True, exist_ok=True)

# Contexte de hashage (bcrypt)
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------- utils JSON (écriture atomique) ----------

def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
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
            try:
                os.remove(tmp)
            except:
                pass

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
    return _pwd_context.hash(pw)
