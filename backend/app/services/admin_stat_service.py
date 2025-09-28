"""
File: backend/app/services/admin_stat_service.py
Role: Centralise les helpers/constantes utilisés par les routes admin stats.
Security: Les routes restent protégées via require_admin côté routes.
Side-effects: lecture/écriture ledger.jsonl et users.json.
"""

import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from typing import Optional

from app.models.users import USERS_FILE
from app.models.offers import OFFERS
from app.core.paths import DATA_ROOT

# --- Constantes / chemins ----------------------------------------------------
PARIS_TZ = ZoneInfo("Europe/Paris")
AUDIT_FILE = (DATA_ROOT / "audit" / "ledger.jsonl")

# --- Helpers date/TZ ---------------------------------------------------------
def _tz_now():
    return datetime.now(PARIS_TZ)

def _parse_dt_any(s: str | None):
    """Parse tolérant -> datetime tz-aware (Europe/Paris) ou None."""
    if not s:
        return None
    s = str(s)
    dt = None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        dt = None
    if not dt:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(s, fmt)
                break
            except Exception:
                continue
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=PARIS_TZ)
    else:
        dt = dt.astimezone(PARIS_TZ)
    return dt

def _bounds_from_range_or_custom(range_key: str | None, start: str | None, end: str | None):
    """
    Supporte:
      - range_key: 'day'|'week'|'month'|'all'
      - OU start/end (YYYY-MM-DD ou ISO)
    start/end priment si fournis.
    """
    now = _tz_now()
    if start or end:
        s = _parse_dt_any(start) if start else None
        e = _parse_dt_any(end) if end else None
        if e and e.hour == 0 and e.minute == 0 and e.second == 0 and len(str(end or "")) == 10:
            e = e + timedelta(days=1) - timedelta(seconds=1)
        if not s and e:
            s = e - timedelta(days=30)
        if s and not e:
            e = now
        return s, e
    k = (range_key or "day").lower()
    if k == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    if k == "week":
        return now - timedelta(days=7), now
    if k == "month":
        return now - timedelta(days=30), now
    return None, now

def _in_window(dt_iso: str | None, start, end) -> bool:
    if not dt_iso:
        return start is None
    dt = _parse_dt_any(dt_iso)
    if not dt:
        return start is None
    s = start if start is None else start.astimezone(PARIS_TZ)
    e = end if end is None else end.astimezone(PARIS_TZ)
    return (s is None or dt >= s) and (e is None or dt <= e)

def _time_bounds(range_key: str):
    now = _tz_now()
    k = (range_key or "day").lower()
    if k == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    if k == "week":
        return now - timedelta(days=7), now
    if k == "month":
        return now - timedelta(days=30), now
    return None, now

# --- Ledger ------------------------------------------------------------------
def _iter_ledger():
    if not AUDIT_FILE.exists():
        return []
    out = []
    with open(AUDIT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                continue
    return out

# --- Users.json --------------------------------------------------------------
def _load_users_json() -> dict:
    if not USERS_FILE.exists():
        return {}
    return json.loads(USERS_FILE.read_text(encoding="utf-8"))

def _user_name(u: dict, uid: str):
    return u.get("username") or u.get("email") or uid

# --- Transactions helpers ----------------------------------------------------
def _infer_subscription_price(u: dict, tx: dict) -> Optional[float]:
    """
    Si la transaction ressemble à un renouvellement d'abonnement et qu'on n'a pas de price_eur,
    on infère le prix depuis OFFERS en fonction du plan courant (ou subscription.type).
    """
    label  = (tx.get("label") or "").lower()
    method = (tx.get("method") or "").lower()
    reason = (tx.get("billing_reason") or "").lower()
    looks_like_sub = (method in {"renewal", "stripe"} or "subscription" in reason or "abonnement" in label)
    if not looks_like_sub:
        return None
    plan = (u.get("subscription") or {}).get("type") or u.get("plan")
    if not plan:
        return None
    offer = OFFERS.get(plan)
    if not offer or offer.get("type") != "subscription":
        return None
    try:
        return float(offer.get("price_eur") or 0)
    except Exception:
        return None

def _is_failed_payment_tx(tx: dict) -> bool:
    lbl = str(tx.get("label") or "").lower()
    status = str(tx.get("status") or "").lower()
    reason = str(tx.get("billing_reason") or "").lower()
    fcode = str(tx.get("failure_code") or "").lower()
    return (
        "échou" in lbl or "echou" in lbl or "failed" in lbl
        or status in {"failed", "payment_failed", "failed_payment"}
        or "payment_failed" in reason
        or bool(fcode)
    )

def _is_subscription_tx(u: dict | None, tx: dict) -> bool:
    lbl = str(tx.get("label") or "").lower()
    method = str(tx.get("method") or "").lower()
    reason = str(tx.get("billing_reason") or "").lower()
    if "abonnement" in lbl or "subscription" in reason or method == "renewal":
        return True
    if u:
        plan = (u.get("subscription") or {}).get("type") or u.get("plan") or ""
        return str(plan).upper().startswith("SUB")
    return False

# --- Utilitaires métier additionnels (réutilisés dans breakdown) -------------
def _price_eur(tx: dict):
    for k in ("price_eur", "amount_eur", "amount", "price_paid"):
        v = tx.get(k)
        if isinstance(v, (int, float)):
            return float(v)
    return None

def _is_backtest(tx: dict) -> bool:
    ttype = (tx.get("type") or "").lower()
    label = (tx.get("label") or "").lower()
    if ttype == "backtest" or "backtest" in label:
        return True
    if tx.get("symbol") and tx.get("timeframe") and tx.get("strategy"):
        return True
    cd = tx.get("credits_delta")
    if isinstance(cd, (int, float)) and cd < 0 and (tx.get("duration_ms") or tx.get("period")):
        return True
    return False

__all__ = [
    "PARIS_TZ", "AUDIT_FILE",
    "_tz_now", "_parse_dt_any", "_bounds_from_range_or_custom", "_in_window", "_time_bounds",
    "_iter_ledger", "_load_users_json", "_user_name",
    "_infer_subscription_price", "_is_failed_payment_tx", "_is_subscription_tx",
    "_price_eur", "_is_backtest",
]
