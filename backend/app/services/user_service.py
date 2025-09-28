"""
File: backend/app/services/user_service.py
Role: Helpers généraux utilisateur (hash, json atomique, audit, url abs, load/save).
"""

from pathlib import Path
from passlib.context import CryptContext
from app.core.paths import USERS_JSON as USERS_FILE, DB_DIR, DATA_ROOT
from app.utils.json_db import read_json, write_json_atomic, file_lock
from fastapi import Request
import json, os, tempfile
from datetime import datetime

# --- Hash (bcrypt) -----------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return _pwd_context.hash(password)

# --- URL absolue -------------------------------------------------------------
def _abs_backend_url(request: Request, path: str) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}{path}"

# --- JSON atomique -----------------------------------------------------------
def _atomic_write_json(path: Path, data: dict) -> None:
    tmp_fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", text=True)
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, path)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

# --- Chargement / sauvegarde users ------------------------------------------
def load_users() -> dict:
    return read_json(USERS_FILE, {})

def save_users(users: dict) -> None:
    lock = DB_DIR / "users.json.lock"
    with file_lock(lock):
        write_json_atomic(USERS_FILE, users)

# --- Audit append-only -------------------------------------------------------
AUDIT_FILE = (DATA_ROOT / "audit" / "ledger.jsonl")
AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)

def _audit_append(evt: dict) -> None:
    path = AUDIT_FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = dict(evt)
        data.setdefault("ts", datetime.utcnow().isoformat() + "Z")
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")
    except Exception:
        pass

# --- util légère -------------------------------------------------------------
def _load_json_safe(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        raw = path.read_text(encoding="utf-8")
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}
