"""
File: backend/app/services/admin_service.py
Role: Regroupe la logique utilitaire/partagée des routes admin (IO disque, audit,
      helpers sur abonnements/transactions, accès users.json, chemins sûrs).
Security: Utilisé par les routes ADMIN uniquement (les checks d’auth restent dans les routes).
Side-effects:
  - Crée les dossiers 'data/audit' et 'data/factures' si absents.
"""

from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any
import json
import os
import shutil

from app.core.paths import (
    DB_DIR,
    OUTPUT_DIR,
    ANALYSIS_DIR,
    USERS_JSON,
    INVOICES_DIR,
    DATA_ROOT,
)
from app.models.offers import OFFERS

PARIS_TZ = ZoneInfo("Europe/Paris")

# === AUDIT LEDGER (append-only) ===
AUDIT_DIR: Path = (DATA_ROOT / "audit").resolve()
AUDIT_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_FILE: Path = (AUDIT_DIR / "ledger.jsonl").resolve()

# 📂 Dossier des factures (même répertoire que l’émetteur d’invoices)
#  → cf. backend/utils/invoice_generator.py qui écrit dans INVOICES_DIR
FACTURES_DIR: Path = INVOICES_DIR.resolve()
FACTURES_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------- Helpers chemins & sécurité ---------------------- #
def safe_under_data_root(p: Path) -> bool:
    """
    True si le chemin résolu est situé sous DATA_ROOT (anti-path traversal).
    Ne lève pas d'exception: renvoie False en cas d'erreur de résolution.
    """
    try:
        return str(p.resolve()).startswith(str(DATA_ROOT.resolve()))
    except Exception:
        return False


def factures_stats() -> Dict[str, int]:
    """
    Agrège le nombre de fichiers et la taille totale (octets) sous FACTURES_DIR.
    Robuste aux erreurs de stat().
    """
    count = 0
    size = 0
    for root, _, files in os.walk(FACTURES_DIR):
        for fn in files:
            count += 1
            try:
                size += (Path(root) / fn).stat().st_size
            except Exception:
                pass
    return {"count": count, "bytes": int(size)}


# ---------------------- Helpers audit / ledger ---------------------- #
def audit_append(obj: Dict[str, Any]) -> None:
    """
    Append JSON line dans le ledger d’audit.
    N’échoue jamais (silencieux) pour ne pas bloquer une requête admin.
    """
    try:
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            obj = {**obj, "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")
    except Exception:
        pass


# ---------------------- Helpers subscriptions & tx ---------------------- #
def infer_subscription_price_from_user(u: dict, tx: dict) -> Optional[float]:
    """
    Déduit un prix d’abonnement à afficher si le tx ne porte pas de price_eur/paid.
    On détecte 'subscription-like' via method/reason/label, puis on lit OFFERS[plan].
    """
    label = (tx.get("label") or "").lower()
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


def _parse_iso(dt: str):
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00"))
    except Exception:
        return None


def _is_failed_payment_tx_local(tx: dict) -> bool:
    lbl = str(tx.get("label") or "").lower()
    status = str(tx.get("status") or "").lower()
    reason = str(tx.get("billing_reason") or "").lower()
    fcode = str(tx.get("failure_code") or "").lower()
    return (
        ("échou" in lbl or "echou" in lbl or "failed" in lbl)
        or status in {"failed", "payment_failed", "failed_payment"}
        or "payment_failed" in reason
        or bool(fcode)
    )


def _is_subscription_tx_local(u: dict | None, tx: dict) -> bool:
    lbl = str(tx.get("label") or "").lower()
    method = str(tx.get("method") or "").lower()
    reason = str(tx.get("billing_reason") or "").lower()
    if "abonnement" in lbl or "subscription" in reason or method == "renewal":
        return True
    if u:
        plan = (u.get("subscription") or {}).get("type") or u.get("plan") or ""
        return str(plan).upper().startswith("SUB")
    return False


# ---------------------- Accès users.json (lecture/écriture) ---------------------- #
USERS_FILE: Path = Path(USERS_JSON)

def load_users() -> dict:
    """Lecture JSON brute de USERS_FILE."""
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_users(data: dict) -> None:
    """Écriture JSON formatée (indent=2) vers USERS_FILE."""
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------------------- Exports utilitaires pour routes ---------------------- #
__all__ = [
    "PARIS_TZ",
    "FACTURES_DIR",
    "AUDIT_DIR",
    "AUDIT_FILE",
    "safe_under_data_root",
    "factures_stats",
    "audit_append",
    "infer_subscription_price_from_user",
    "_parse_iso",
    "_is_failed_payment_tx_local",
    "_is_subscription_tx_local",
    "USERS_FILE",
    "load_users",
    "save_users",
    # chemins utiles si besoin
    "ANALYSIS_DIR",
    "DATA_ROOT",
]
