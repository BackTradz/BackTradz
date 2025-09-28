"""
File: backend/app/services/csv_library_service.py
Role: Centralise les helpers utilisés par les routes csv_library
      (gestion extractions récentes, résolution chemins, horodatage).
Security: Les routes restent protégées côté routes (X-API-Key, crédits).
Side-effects: lecture/écriture disque (JSONL, CSV).
"""

from pathlib import Path
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
import json
import os

from app.core.paths import OUTPUT_DIR, OUTPUT_LIVE_DIR, DATA_ROOT

# --- Horodatage local (Europe/Brussels) ---
try:
    from zoneinfo import ZoneInfo
    _TZ = ZoneInfo("Europe/Brussels")
    def now_iso():
        return datetime.now(_TZ).isoformat()
except Exception:
    def now_iso():
        return datetime.now(timezone.utc).astimezone().isoformat()

# --- Stockage des extractions récentes ---
RECENT_STORE_DIR = DATA_ROOT / "storage" / "extractions"
RECENT_TTL_HOURS = 48
RECENT_MAX_RETURN = 10

def _ensure_store_dir():
    RECENT_STORE_DIR.mkdir(parents=True, exist_ok=True)

def _user_identifier(user):
    for k in ("id", "user_id", "email"):
        if hasattr(user, k) and getattr(user, k):
            return str(getattr(user, k))
        if isinstance(user, dict) and user.get(k):
            return str(user.get(k))
    return "unknown"

def _store_extraction_log(user, entry: dict):
    _ensure_store_dir()
    uid = _user_identifier(user)
    fpath = RECENT_STORE_DIR / f"{uid}.jsonl"
    now = datetime.now(timezone.utc)
    entry.setdefault("created_at", now.isoformat())
    entry.setdefault("expires_at", (now + timedelta(hours=RECENT_TTL_HOURS)).isoformat())
    with fpath.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

def _load_recent_extractions(user):
    _ensure_store_dir()
    uid = _user_identifier(user)
    fpath = RECENT_STORE_DIR / f"{uid}.jsonl"
    if not fpath.exists():
        return []
    now = datetime.now(timezone.utc)
    rows = []
    with fpath.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            try:
                exp = datetime.fromisoformat(obj.get("expires_at"))
            except Exception:
                exp = now
            if exp <= now:
                continue
            rel = obj.get("relative_path") or obj.get("path")
            if not rel:
                continue
            rel = str(rel).replace("\\", "/")
            exists = False
            roots = [OUTPUT_DIR.resolve(), OUTPUT_LIVE_DIR.resolve()]
            for root in roots:
                cand = (root / rel).resolve()
                if cand.exists():
                    exists = True
                    break
            if not exists:
                try:
                    cand_abs = Path(rel).resolve()
                    if cand_abs.exists():
                        exists = True
                except Exception:
                    pass
            if not exists:
                continue
            rows.append(obj)
    rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return rows[:RECENT_MAX_RETURN]

# --- Résolution chemin pour download ---
def _resolve_storage_path_for_download(req_path: str):
    s = str(req_path or "").replace("\\", "/")
    if s.lower().startswith("app/"):
        s = s[8:]
    s_path = Path(s)

    roots = [
        (OUTPUT_DIR.resolve(), "output"),
        (OUTPUT_LIVE_DIR.resolve(), "output_live"),
    ]

    order = roots
    low = s.lower()
    if low.startswith("output_live/"):
        order = [roots[1], roots[0]]
        s_path = Path(s[len("output_live/"):])
    elif low.startswith("output/"):
        order = [roots[0], roots[1]]
        s_path = Path(s[len("output/"):])

    for root_abs, _tag in order:
        cand = (root_abs / s_path).resolve()
        if cand.exists():
            rel = cand.relative_to(root_abs)
            return cand, root_abs, str(rel).replace("\\", "/")

    from pathlib import Path as _P
    parts = list(s_path.parts)
    if len(parts) >= 3:
        first, sym_dir = parts[0], parts[1]
        if str(first).lower() == "output_live" and "-" in sym_dir:
            parts2 = parts[:]
            parts2[1] = sym_dir.replace("-", "")
            if "." in parts2[-1]:
                parts2[-1] = parts2[-1].replace("-", "")
            sp2 = _P(*parts2)
            for root_abs, _tag in order:
                cand2 = (root_abs / sp2).resolve()
                if cand2.exists():
                    rel2 = cand2.relative_to(root_abs)
                    return cand2, root_abs, str(rel2).replace("\\", "/")

    try:
        cand_abs = Path(s).resolve()
    except Exception:
        cand_abs = None
    if cand_abs and cand_abs.exists():
        for root_abs, _tag in roots:
            try:
                rel = cand_abs.relative_to(root_abs)
                return cand_abs, root_abs, str(rel).replace("\\", "/")
            except Exception:
                pass

    raise HTTPException(status_code=404, detail="Fichier introuvable")
