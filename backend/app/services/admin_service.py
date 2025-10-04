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
from typing import Optional, Dict, Any, List, Set
import json
import os
import shutil
import zipfile
import re
from datetime import datetime, timezone

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


# =======================================================================
#  IMPORT MENSUEL OUTPUT (add-only, idempotent)
#  - Filtre strict sur <PAIR>/<YYYY-MM>/*.csv
#  - mode=skip|overwrite  (défaut: skip)
#  - dry_run=True pour simuler
#  - Archive le ZIP + génère un manifest_<YYYY-MM>.json par paire
# =======================================================================
def _is_valid_month(s: str) -> bool:
    return bool(re.match(r"^\d{4}-\d{2}$", s or ""))


def _safe_month_dir(pair: str, month: str) -> Path:
    """OUTPUT_DIR/<PAIR>/<YYYY-MM> (sécurisé)"""
    p = (OUTPUT_DIR / pair / month).resolve()
       # garde-fou: sous DATA_ROOT + sous OUTPUT_DIR
    if not safe_under_data_root(p):
        raise RuntimeError("month_dir_outside_DATA_ROOT")
    if not str(p).startswith(str(OUTPUT_DIR.resolve())):
        raise RuntimeError("month_dir_outside_OUTPUT_DIR")
    return p


def _write_manifest_for_pair(pair: str, month: str) -> str:
    """Écrit/MAJ manifest_<YYYY-MM>.json dans le dossier du mois (par paire)."""
    month_dir = _safe_month_dir(pair, month)
    files: List[Dict[str, Any]] = []
    try:
        for f in month_dir.glob("*.csv"):
            st = f.stat()
            files.append({
                "name": f.name,
                "bytes": int(st.st_size),
                "mtime": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat().replace("+00:00","Z"),
               })
    except Exception:
        # pas bloquant
        pass
    manifest = {
        "month": month,
        "pair": pair,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "files": files,
    }
    mf = month_dir / f"manifest_{month}.json"
    mf.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(mf)

def import_output_month_from_zip(
    zip_path: Path,
    target_month: str,
    mode: str = "skip",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Import 'output' (mois ciblé) depuis un ZIP.
    - Ajoute uniquement des .csv sous output/<PAIR>/<YYYY-MM>/...
    - Préserve l'arbo, 'skip' par défaut si le fichier existe déjà.
    - Archive le ZIP en /data/archives/output/<YYYY-MM>/...
    - Génère un manifest_<YYYY-MM>.json par paire importée.
    """
    if not _is_valid_month(target_month):
        raise ValueError("target_month invalide (YYYY-MM attendu)")
    mode = (mode or "skip").strip().lower()
    if mode not in {"skip", "overwrite"}:
        raise ValueError("mode invalide (skip|overwrite)")

    added = 0
    skipped = 0
    overwritten = 0
    errors: List[str] = []
    touched_pairs: Set[str] = set()

    try:
        with zipfile.ZipFile(str(zip_path)) as zf:
            for zi in zf.infolist():
                if zi.is_dir():
                    continue
                path_str = zi.filename.replace("\\", "/")
                parts = [p for p in path_str.split("/") if p]
                # on ne traite que les chemins qui contiennent le mois ciblé
                try:
                    idx = parts.index(target_month)
                except ValueError:
                    continue
                if idx == 0 or idx == len(parts) - 1:
                    # chemin inattendu → ignore
                    continue
                pair = parts[idx - 1]
                fname = parts[-1]
                if not fname.lower().endswith(".csv"):
                    continue

                month_dir = _safe_month_dir(pair, target_month)
                dest = (month_dir / fname).resolve()
                if not safe_under_data_root(dest) or not str(dest).startswith(str(OUTPUT_DIR.resolve())):
                    errors.append(f"unsafe_path:{pair}/{target_month}/{fname}")
                    continue

                if dest.exists():
                    if mode == "skip":
                        skipped += 1
                        touched_pairs.add(pair)
                        continue
                    # overwrite autorisé
                    if dry_run:
                        overwritten += 1
                        touched_pairs.add(pair)
                        continue
                    try:
                        month_dir.mkdir(parents=True, exist_ok=True)
                        with zf.open(zi, "r") as src, open(dest, "wb") as out:
                            shutil.copyfileobj(src, out, length=1024 * 1024)
                        overwritten += 1
                        touched_pairs.add(pair)
                    except Exception:
                        errors.append(f"overwrite_fail:{pair}/{target_month}/{fname}")
                    continue

               # ajout
                if dry_run:
                    added += 1
                    touched_pairs.add(pair)
                else:
                    try:
                        month_dir.mkdir(parents=True, exist_ok=True)
                        with zf.open(zi, "r") as src, open(dest, "wb") as out:
                            shutil.copyfileobj(src, out, length=1024 * 1024)
                        added += 1
                        touched_pairs.add(pair)
                    except Exception:
                        errors.append(f"add_fail:{pair}/{target_month}/{fname}")
    except zipfile.BadZipFile:
        raise ValueError("Fichier ZIP invalide")
    except Exception as e:
        # Erreur générique lecture ZIP
        raise RuntimeError(f"Échec lecture ZIP: {e}")

    manifest_paths: List[str] = []
    archive_path = ""

    if not dry_run:
        # manifest par paire touchée
        for p in sorted(touched_pairs):
            try:
                mf = _write_manifest_for_pair(p, target_month)
                manifest_paths.append(mf)
            except Exception:
                errors.append(f"manifest_fail:{p}/{target_month}")

        # archive du zip source
        try:
            arch_dir = (DATA_ROOT / "archives" / "output" / target_month).resolve()
            arch_dir.mkdir(parents=True, exist_ok=True)
            if not safe_under_data_root(arch_dir):
                raise RuntimeError("archive_dir_outside_DATA_ROOT")
            ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
            final_zip = arch_dir / f"output_{target_month}_{ts}.zip"
            shutil.copy2(str(zip_path), str(final_zip))
            archive_path = str(final_zip)
        except Exception:
            errors.append("archive_fail")

    return {
        "ok": True,
        "target_month": target_month,
        "mode": mode,
        "dry_run": dry_run,
        "added": added,
        "skipped": skipped,
        "overwritten": overwritten,
        "errors": errors,
        "manifest_paths": manifest_paths,
        "archive_path": archive_path,
    }


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
    # === nouvel export pour la maintenance ===
    "import_output_month_from_zip",
]

