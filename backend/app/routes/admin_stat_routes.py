# backend/routes/admin_stat_routes.py
# =============================================================================
# Admin Stats Routes
# -----------------------------------------------------------------------------
# - Expose toutes les routes "statistiques" de l'admin :
#     * /admin/metrics/overview                → KPIs filtrés (jour/semaine/mois/tout)
#     * /admin/metrics/users_timeseries        → sparkline inscriptions
#     * /admin/metrics/details                 → générique (kpi=...)
#     * /admin/metrics/details/sales|offered|bought|backtests|new_users → overlays
#
# - Helpers de dates/TZ centralisés (Europe/Paris).
# - Auth admin : header "X-API-Key" avec e-mail admin strict (même logique que admin_routes).
# - Lecture: backend/models/users.USERS_FILE  (users.json + purchase_history).
#
# ⚠️ 0 régression : les chemins d’URL restent identiques à ceux déjà utilisés par le front.
# =============================================================================

from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json
from app.models.users import USERS_FILE, get_user_by_token
import builtins
from app.core.admin import require_admin as _admin_guard
from app.models.users import USERS_FILE
from app.models.offers import OFFERS  # prix des plans (SUB_9, SUB_25, …)
from app.core.paths import DATA_ROOT
from pathlib import Path as _Path
AUDIT_FILE = (DATA_ROOT / "audit" / "ledger.jsonl")

stats_router = APIRouter()

# --- Config & Helpers --------------------------------------------------------

PARIS_TZ = ZoneInfo("Europe/Paris")



# === BACKTRADZ 2025-09-07: Helpers unifiés (Europe/Paris + période custom) ===
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

PARIS_TZ = ZoneInfo("Europe/Paris")

def _tz_now():
    return datetime.now(PARIS_TZ)

def _parse_dt_any(s: str):
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
    # custom en priorité
    if start or end:
        s = _parse_dt_any(start) if start else None
        e = _parse_dt_any(end) if end else None
        # si uniquement une date "YYYY-MM-DD" pour end, étendre à fin de journée
        if e and e.hour == 0 and e.minute == 0 and e.second == 0 and len(str(end or "")) == 10:
            e = e + timedelta(days=1) - timedelta(seconds=1)
        # défauts
        if not s and e:
            s = e - timedelta(days=30)
        if s and not e:
            e = now
        return s, e

    # sinon: range
    k = (range_key or "day").lower()
    if k == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    if k == "week":
        return now - timedelta(days=7), now
    if k == "month":
        return now - timedelta(days=30), now
    return None, now  # all-time

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
    """
    'day'|'week'|'month'|'all' → (start, end) aware Europe/Paris.
    - day   : depuis minuit du jour courant
    - week  : 7 derniers jours
    - month : 30 derniers jours
    - all   : pas de borne de début
    """
    now = _tz_now()
    k = (range_key or "day").lower()
    if k == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    if k == "week":
        return now - timedelta(days=7), now
    if k == "month":
        return now - timedelta(days=30), now
    return None, now

# === Ledger (audit) ===
def _iter_ledger():
    """Retourne la liste des événements du ledger (jsonl)."""
    if not AUDIT_FILE.exists():
        return []
    out = []
    with open(AUDIT_FILE, "r", encoding="utf-8") as f:
        import json as _json
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(_json.loads(line))
            except Exception:
                continue
    return out

def _load_users_json() -> dict:
    if not USERS_FILE.exists():
        return {}
    return json.loads(USERS_FILE.read_text(encoding="utf-8"))

def _user_name(u: dict, uid: str):
    return u.get("username") or u.get("email") or uid

def _infer_subscription_price(u: dict, tx: dict) -> float | None:
    """
    Si la transaction ressemble à un renouvellement d'abonnement et qu'on n'a pas de price_eur,
    on infère le prix depuis OFFERS en fonction du plan courant (ou subscription.type).
    """
    label  = (tx.get("label") or "").lower()
    method = (tx.get("method") or "").lower()
    reason = (tx.get("billing_reason") or "").lower()

    looks_like_sub = (
        method in {"renewal", "stripe"} or
        "subscription" in reason or
        "abonnement" in label
    )
    if not looks_like_sub:
        return None

    plan = (u.get("subscription") or {}).get("type") or u.get("plan")
    if not plan:
        return None

    offer = OFFERS.get(plan)
    if not offer:
        return None
    # On ne force le prix que si l’offre est bien un abonnement
    if offer.get("type") != "subscription":
        return None

    return float(offer.get("price_eur") or 0)
# --- helpers en haut du fichier (près de _infer_subscription_price)
def _is_failed_payment_tx(tx: dict) -> bool:
    lbl = str(tx.get("label") or "").lower()
    status = str(tx.get("status") or "").lower()
    reason = str(tx.get("billing_reason") or "").lower()
    fcode = str(tx.get("failure_code") or "").lower()
    # mots-clés FR/EN + champs status/reason Stripe
    return (
        "échou" in lbl or "echou" in lbl or "failed" in lbl or
        status in {"failed", "payment_failed", "failed_payment"} or
        "payment_failed" in reason or
        bool(fcode)
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

# --- ROUTES KPIs -------------------------------------------------------------

@stats_router.get("/admin/metrics/overview")
def metrics_overview(
    range: str = "day",
    active_window_minutes: int = 10,
    request: Request = None,
    start: str | None = None,
    end: str | None = None
):
    """
    KPIs consolidés filtrés par période:
      - total_sales_eur         : somme € (price_paid>0 ou price_eur)
      - total_credits_bought    : nb crédits achetés (type 'purchase' ou method ∈ {stripe,paypal,card})
      - credits_offered         : nb crédits offerts (bonus/mensuel/offert)
      - backtests_count         : nb entrées type backtest
      - total_users             : total base
      - new_users               : nouveaux sur la période (création/dates fallback)
      - active_now              : actifs récents (last_seen dans window 'active_window_minutes')
    """
    _ = _admin_guard(request)

    start, end = _time_bounds(range)
    now = end
    active_threshold = now - timedelta(minutes=active_window_minutes)

    users = _load_users_json()

    total_users = len(users)
    new_users = 0
    active_now = 0
    purchases_count = 0
    total_sales_eur = 0.0
    total_credits_bought = 0
    credits_offered = 0
    backtests_count = 0
    deleted_users = 0
    unsubscribed_users = 0
    failed_payments_count = 0


    for _, u in users.items():
        # nouveaux inscrits
        created_at = u.get("created_at") or u.get("signup_date") or u.get("date")
        if start and _in_window(created_at, start, end):
            new_users += 1

        # actifs "maintenant"
        ls = u.get("last_seen")
        dt_ls = _parse_dt_any(ls) if ls else None
        if dt_ls and dt_ls >= active_threshold:
            active_now += 1

        # transactions
        for tx in (u.get("purchase_history") or []):
            if not _in_window(tx.get("date"), start, end):
                continue

            label  = str(tx.get("label") or "").lower()
            ttype  = str(tx.get("type") or "").lower()
            method = str(tx.get("method") or "").lower()

            # ventes €
            price_eur = tx.get("price_eur")
            if price_eur is None:
                p = tx.get("price_paid")
                if isinstance(p, (int, float)) and p > 0:
                    price_eur = float(p)
                else:
                    # 👇 NEW: inférer le prix d’un abonnement si renewal
                    inferred = _infer_subscription_price(u, tx)
                    if isinstance(inferred, float) and inferred > 0:
                        price_eur = inferred

            if isinstance(price_eur, (int, float)):
                total_sales_eur += float(price_eur)
                purchases_count += 1


            # crédits
            ca = tx.get("credits_added")
            if isinstance(ca, (int, float)):
                if (ttype == "purchase" or method in {"stripe", "paypal", "card"}) and ca > 0:
                    total_credits_bought += int(ca)
                if (ttype in {"bonus", "monthly", "mensuel"} or "bonus" in label or "mensuel" in label or "offert" in label):
                    credits_offered += int(ca)

            # backtests
            if ttype == "backtest" or "backtest" in label:
                backtests_count += 1


            if _is_failed_payment_tx(tx):
                failed_payments_count += 1


    # === Consolidation via ledger: inclut transactions d'utilisateurs supprimés ===
    for ev in _iter_ledger():
        if ev.get("type") != "tx":
            continue
        tx = ev.get("data") or {}
        if not _in_window(tx.get("date"), start, end):
            continue

        label  = str(tx.get("label")  or "").lower()
        ttype  = str(tx.get("type")   or "").lower()
        method = str(tx.get("method") or "").lower()

        # ventes €
        price_eur = tx.get("price_eur")
        if price_eur is None:
            p = tx.get("price_paid")
            if isinstance(p, (int, float)) and p > 0:
                price_eur = float(p)
        if isinstance(price_eur, (int, float)):
            total_sales_eur += float(price_eur)
            purchases_count += 1

        # crédits
        ca = tx.get("credits_added")
        if isinstance(ca, (int, float)):
            if (ttype == "purchase" or method in {"stripe", "paypal", "card"}) and ca > 0:
                total_credits_bought += int(ca)
            if (ttype in {"bonus", "monthly", "mensuel"} or "bonus" in label or "mensuel" in label or "offert" in label):
                credits_offered += int(ca)

        # backtests
        if ttype == "backtest" or "backtest" in label:
            backtests_count += 1

        if _is_failed_payment_tx(tx):
            failed_payments_count += 1



    # (enlever ces 2 lignes du bloc interne)
    deleted_users = sum(1 for ev in _iter_ledger() if ev.get("type") == "user_deleted")
    unsubscribed_users = sum(1 for ev in _iter_ledger() if ev.get("type") == "subscription_cancelled")

    return {
        "total_users": total_users,
        "new_users": new_users if start else 0,
        "active_now": active_now,
        "purchases_count": purchases_count,
        "total_sales_eur": round(total_sales_eur, 2),
        "total_credits_bought": total_credits_bought,
        "credits_offered": credits_offered,
        "backtests_count": backtests_count,
        "deleted_users": deleted_users,
        "unsubscribed_users": unsubscribed_users,
        "failed_payments": failed_payments_count,
    }

@stats_router.get("/admin/metrics/users_timeseries")
def users_timeseries(range: str = "month", request: Request = None):
    """
    Mini série temporelle des nouveaux inscrits (selon range).
    Retour: {"range": "..", "series": [{x, y}]}
    """
    _ = _admin_guard(request)

    now = _tz_now()
    if range == "day":
        buckets = [(now - timedelta(hours=i)).strftime("%Y-%m-%d %H:00") for i in builtins.range(23, -1, -1)]
        keyfmt = "%Y-%m-%d %H:00"
        horizon = now - timedelta(days=1)
    elif range == "week":
        buckets = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in builtins.range(6, -1, -1)]
        keyfmt = "%Y-%m-%d"
        horizon = now - timedelta(days=7)
    else:
        buckets = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in builtins.range(29, -1, -1)]
        horizon = now - timedelta(days=30)

    counts = {k: 0 for k in buckets}
    users = _load_users_json()

    for _, u in users.items():
        created_at = u.get("created_at") or u.get("signup_date") or u.get("date") or u.get("last_seen")
        dt = _parse_dt_any(created_at) if created_at else None
        if not dt or dt < horizon:
            continue
        key = dt.strftime(keyfmt)
        if key in counts:
            counts[key] += 1

    series = [{"x": k, "y": v} for k, v in counts.items()]
    return {"range": range, "series": series}

# --- ROUTES DÉTAILS (overlays) ----------------------------------------------

@stats_router.get("/admin/metrics/details")
def metrics_details(kpi: str, range: str = "day", request: Request = None, start: str | None = None, end: str | None = None):
    """
    Générique: kpi ∈ {"sales","credits_bought","credits_offered","backtests","new_users"}.
    Retourne toujours une liste (tableau).
    """
    
    _ = _admin_guard(request)
    start, _end = _bounds_from_range_or_custom(range, start, end)
    users = _load_users_json()
    rows = []

    if kpi == "new_users":
        for uid, u in users.items():
            created = u.get("created_at") or u.get("signup_date") or u.get("date")
            if _in_window(created, start, _end):
                rows.append({
                    "date": _parse_dt_any(created).strftime("%Y-%m-%d %H:%M:%S") if created else None,
                    "email": u.get("email"),
                    "username": u.get("username"),
                    "plan": u.get("plan", "free")
                })
        rows.sort(key=lambda r: r["date"] or "", reverse=True)
        return rows
    

    if kpi == "user_events":
        rows = []
        for ev in _iter_ledger():
            if ev.get("type") not in {"user_deleted", "subscription_cancelled"}:
                continue
            ts = ev.get("ts")
            dt = _parse_dt_any(ts) if ts else None
            if not _in_window(ts, start, _end):
                continue
            rows.append({
                "date": dt.strftime("%Y-%m-%d %H:%M:%S") if dt else "",
                "user_id": ev.get("user_id"),
                "event": "Suppression compte" if ev.get("type") == "user_deleted" else "Désabonnement",
            })
        rows.sort(key=lambda r: r["date"], reverse=True)
        return rows

    



    for uid, u in users.items():
        uname = _user_name(u, uid)
        for tx in (u.get("purchase_history") or []):
            if not _in_window(tx.get("date"), start, _end):
                continue

            label  = str(tx.get("label") or "").lower()
            ttype  = str(tx.get("type") or "").lower()
            method = str(tx.get("method") or "").lower()

            if kpi == "sales":
                price = tx.get("price_eur")
                if price is None:
                    p = tx.get("price_paid")
                    if isinstance(p, (int, float)) and p > 0:
                        price = float(p)
                if isinstance(price, (int, float)):
                    rows.append({
                        "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                        "user": uname,
                        "label": tx.get("label") or tx.get("offer_id", "Achat"),
                        "amount_eur": float(price),
                        "method": (tx.get("method") or "unknown").lower(),   # 👈 NEW
                    })

            elif kpi == "credits_bought":
                ca = tx.get("credits_added")
                if isinstance(ca, (int, float)) and ca > 0 and (ttype == "purchase" or method in {"stripe", "paypal", "card"}):
                    rows.append({
                        "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                        "user": uname,
                        "label": tx.get("label"),
                        "credits": int(ca),
                    })
            elif kpi == "credits_offered":
                ca = tx.get("credits_added")
                if isinstance(ca, (int, float)) and ca > 0 and (ttype == "bonus" or "bonus" in label or "mensuel" in label or "offert" in label or method in {"offert","bonus"}):
                    rows.append({
                        "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                        "user": uname,
                        "label": tx.get("label") or "Crédits offerts",
                        "credits": int(ca),
                    })
            elif kpi == "backtests":
                if ttype == "backtest" or "backtest" in label:
                    rows.append({
                        "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                        "user": uname,
                        "label": tx.get("label"),
                        "symbol": tx.get("symbol"),
                        "timeframe": tx.get("timeframe"),
                        "strategy": tx.get("strategy"),
                        "period": tx.get("period"),
                    })

            elif kpi == "failed_payments":
                if _is_failed_payment_tx(tx):
                    # montant: price_eur -> price_paid -> prix de l'offre (abo) si connu
                    price = tx.get("price_eur")
                    if price is None:
                        p = tx.get("price_paid")
                        if isinstance(p, (int, float)) and p > 0:
                            price = float(p)
                    if not isinstance(price, (int, float)) or price <= 0:
                        price = _infer_subscription_price(u, tx) or 0.0  # 👈 inférence abo

                    rows.append({
                        "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                        "user": uname,
                        "label": tx.get("label") or "Paiement échoué",
                        "method": (tx.get("method") or "unknown").lower(),
                        "kind": "abo" if _is_subscription_tx(u, tx) else "one_shot",
                        "amount_eur": float(price),
                    })



    rows.sort(key=lambda r: r["date"], reverse=True)

    # === Complément via ledger (inclut données d'utilisateurs supprimés) ===
    for ev in _iter_ledger():
        if ev.get("type") != "tx":
            continue
        tx = ev.get("data") or {}
        # on filtre sur la date métier de la transaction
        if not _in_window(tx.get("date"), start, _end):
            continue

        label  = str(tx.get("label")  or "")
        ttype  = str(tx.get("type")   or "").lower()
        method = str(tx.get("method") or "").lower()
        user_id = ev.get("user_id") or tx.get("user_id") or "—"
        date_s  = tx.get("date") or ev.get("ts") or ""

        if kpi == "sales":
            price = tx.get("price_eur")
            if price is None:
                p = tx.get("price_paid")
                if isinstance(p, (int, float)) and p > 0:
                    price = float(p)
                else:
                    price = _infer_subscription_price(u, tx)  # 👈 NEW
            if isinstance(price, (int, float)) and price > 0:
                rows.append({
                    "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                    "user": uname,
                    "label": tx.get("label") or tx.get("offer_id", "Achat"),
                    "amount_eur": float(price),
                    "method": (tx.get("method") or "unknown").lower(),
                })


        elif kpi == "credits_bought":
            ca = tx.get("credits_added")
            if isinstance(ca, (int, float)) and ca > 0 and (ttype == "purchase" or method in {"stripe", "paypal", "card"}):
                rows.append({
                    "date": date_s,
                    "user": user_id,
                    "label": label or "—",
                    "credits": int(ca),
                })

        elif kpi == "credits_offered":
            ca = tx.get("credits_added")
            if isinstance(ca, (int, float)) and ca > 0 and (
                ttype in {"bonus", "monthly", "mensuel"} or
                "bonus" in label.lower() or "mensuel" in label.lower() or "offert" in label.lower()
            ):
                rows.append({
                    "date": date_s,
                    "user": user_id,
                    "label": label or "—",
                    "credits": int(ca),
                })

        elif kpi == "backtests":
            if ttype == "backtest" or "backtest" in label.lower():
                rows.append({
                    "date": date_s,
                    "user": user_id,
                    "label": label or "Backtest",
                    "symbol": tx.get("symbol") or tx.get("pair") or "—",
                    "timeframe": tx.get("timeframe") or tx.get("tf") or "—",
                    "strategy": tx.get("strategy") or "—",
                    "period": tx.get("period") or "—",
                })

        elif kpi == "failed_payments":
            if _is_failed_payment_tx(tx):
                price = tx.get("price_eur")
                if price is None:
                    p = tx.get("price_paid")
                    if isinstance(p, (int, float)) and p > 0:
                        price = float(p)
                if not isinstance(price, (int, float)) or price <= 0:
                    # tentative: déduire via offer_id/plan s'ils sont présents dans l’événement
                    offer_id = tx.get("offer_id") or tx.get("plan")
                    offer = OFFERS.get(offer_id) if offer_id else None
                    if offer and offer.get("type") == "subscription":
                        price = float(offer.get("price_eur") or 0)

                rows.append({
                    "date": date_s,
                    "user": user_id,
                    "label": label or "Paiement échoué",
                    "method": method or "unknown",
                    "kind": "abo" if _is_subscription_tx(None, tx) else "one_shot",
                    "amount_eur": float(price or 0),
                })



    # Tri décroissant par date, puis return
    rows.sort(key=lambda r: r.get("date",""), reverse=True)
    return rows


@stats_router.get("/admin/metrics/details/sales")
def details_sales(range: str = "day", request: Request = None):
    _ = _admin_guard(request)
    start, end = _time_bounds(range)
    users = _load_users_json()
    rows = []
    for uid, u in users.items():
        uname = _user_name(u, uid)
        for tx in (u.get("purchase_history") or []):
            if not _in_window(tx.get("date"), start, end):
                continue
            price = tx.get("price_eur")
            if price is None:
                p = tx.get("price_paid")
                if isinstance(p, (int, float)) and p > 0:
                    price = float(p)
            if isinstance(price, (int, float)):
                rows.append({
                    "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                    "user": uname,
                    "label": tx.get("label") or tx.get("offer_id", "Achat"),
                    "amount": float(price),
                    "method": (tx.get("method") or "unknown").lower(),  # 👈 NEW
                })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows

@stats_router.get("/admin/metrics/details/offered")
def details_offered(range: str = "day", request: Request = None):
    _ = _admin_guard(request)
    start, end = _time_bounds(range)
    users = _load_users_json()
    rows = []
    for uid, u in users.items():
        uname = _user_name(u, uid)
        for tx in (u.get("purchase_history") or []):
            if not _in_window(tx.get("date"), start, end):
                continue
            label  = (tx.get("label") or "").lower()
            method = (tx.get("method") or "").lower()
            ca = tx.get("credits_added")
            if isinstance(ca, (int, float)) and ca > 0 and (
                "bonus" in label or "mensuel" in label or "offert" in label or method in {"offert", "bonus"}
            ):
                rows.append({
                    "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                    "user": uname,
                    "label": tx.get("label") or "Crédits offerts",
                    "credits": int(ca),
                })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows

@stats_router.get("/admin/metrics/details/bought")
def details_bought(range: str = "day", request: Request = None):
    _ = _admin_guard(request)
    start, end = _time_bounds(range)
    users = _load_users_json()
    rows = []
    for uid, u in users.items():
        uname = _user_name(u, uid)
        for tx in (u.get("purchase_history") or []):
            if not _in_window(tx.get("date"), start, end):
                continue
            method = (tx.get("method") or "").lower()
            ttype  = (tx.get("type") or "").lower()
            ca = tx.get("credits_added")
            if isinstance(ca, (int, float)) and ca > 0 and (ttype == "purchase" or method in {"stripe", "paypal", "card"}):
                rows.append({
                    "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                    "user": uname,
                    "label": tx.get("label") or tx.get("offer_id", "Achat"),
                    "credits": int(ca),
                })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows

@stats_router.get("/admin/metrics/details/backtests")
def details_backtests(range: str = "day", request: Request = None):
    _ = _admin_guard(request)
    start, end = _time_bounds(range)
    users = _load_users_json()
    rows = []
    for uid, u in users.items():
        uname = _user_name(u, uid)
        for tx in (u.get("purchase_history") or []):
            if not _in_window(tx.get("date"), start, end):
                continue
            ttype  = (tx.get("type") or "").lower()
            label  = (tx.get("label") or "").lower()
            if ttype == "backtest" or "backtest" in label:
                rows.append({
                    "date": _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d %H:%M:%S"),
                    "user": uname,
                    "label": tx.get("label"),
                    "symbol": tx.get("symbol"),
                    "timeframe": tx.get("timeframe"),
                    "strategy": tx.get("strategy"),
                    "period": tx.get("period"),
                })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows

@stats_router.get("/admin/metrics/details/new_users")
def details_new_users(range: str = "day", request: Request = None):
    _ = _admin_guard(request)
    start, end = _time_bounds(range)
    users = _load_users_json()
    rows = []
    for uid, u in users.items():
        created = u.get("created_at") or u.get("signup_date") or u.get("date")
        dt = _parse_dt_any(created) if created else None
        if not dt:
            # fallback: 1ère transaction
            first = None
            for tx in (u.get("purchase_history") or []):
                d = _parse_dt_any(tx.get("date"))
                if d and (first is None or d < first):
                    first = d
            dt = first
        if not dt or not _in_window(dt.isoformat(), start, end):
            continue
        rows.append({
            "date": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "email": u.get("email"),
            "username": u.get("username"),
            "plan": u.get("plan", "free")
        })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows

@stats_router.get("/admin/metrics/breakdown")
def metrics_breakdown(
    kind: str = "sales_by_method",
    range: str = "day",
    request: Request = None,
    start: str | None = None,
    end: str | None = None,
    limit: int = 20,  # utilisé pour top_customers
):
    """
    kind ∈ {
      'sales_by_method', 'credits_by_method', 'revenue_by_day',
      'revenue_by_hour',
      'backtests_by_strategy','backtests_by_symbol','backtests_by_timeframe',
      'backtests_by_hour_heatmap','backtests_duration_histogram',
      'credits_flow',
      'active_users_daily','dau_wau_mau',
      'top_customers'
    }
    """
    _ = _admin_guard(request)
    start_dt, end_dt = _bounds_from_range_or_custom(range, start, end)
    users = _load_users_json()

    def mkey(m: str):
        m = (m or "").lower()
        if m in {"stripe", "paypal", "crypto"}:
            return m
        if m in {"card", "visa", "mastercard"}:
            return "stripe"
        if m in {"offert", "bonus"}:
            return "offert"
        return "other"

    # Détection robuste d'un "backtest" dans purchase_history
    def _is_backtest(tx: dict) -> bool:
        ttype = (tx.get("type") or "").lower()
        label = (tx.get("label") or "").lower()
        if ttype == "backtest" or "backtest" in label:
            return True
        # cas actuel: symbol/timeframe/strategy + éventuellement credits_delta négatif
        if tx.get("symbol") and tx.get("timeframe") and tx.get("strategy"):
            return True
        cd = tx.get("credits_delta")
        if isinstance(cd, (int, float)) and cd < 0 and (tx.get("duration_ms") or tx.get("period")):
            return True
        return False

    # Prix payé en € peu importe le schéma
    def _price_eur(tx: dict):
        for k in ("price_eur", "amount_eur", "amount", "price_paid"):
            v = tx.get(k)
            if isinstance(v, (int, float)):
                return float(v)
        return None

    # ---- lecture ledger (audit) ----
    from pathlib import Path as _Path
    AUDIT_FILE = _Path("backend/data/audit/ledger.jsonl")

    def _iter_ledger():
        if not AUDIT_FILE.exists():
            return []
        out = []
        with open(AUDIT_FILE, "r", encoding="utf-8") as f:
            import json as _json
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(_json.loads(line))
                except Exception:
                    continue
        return out


    # --------- existants (inchangés) ----------
    if kind in {"sales_by_method", "credits_by_method"}:
        agg = {}

        # 1) Agrégation depuis users.json
        for _, u in users.items():
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                method = mkey(tx.get("method"))

                if kind == "sales_by_method":
                    price = tx.get("price_eur")
                    if price is None:
                        p = tx.get("price_paid")
                        if isinstance(p, (int, float)) and p > 0:
                            price = float(p)
                    if not isinstance(price, (int, float)) or price <= 0:
                        continue
                    row = agg.setdefault(method, {"count": 0, "total_eur": 0.0})
                    row["count"] += 1
                    row["total_eur"] += float(price)

                else:  # credits_by_method
                    ca = tx.get("credits_added")
                    ttype = (tx.get("type") or "").lower()
                    if not (isinstance(ca, (int, float)) and ca > 0 and (ttype == "purchase" or method in {"stripe", "paypal", "crypto"})):
                        continue
                    row = agg.setdefault(method, {"count": 0, "credits": 0})
                    row["count"] += 1
                    row["credits"] += int(ca)

        # 2) Consolidation depuis le ledger (utilisateurs supprimés inclus)
        for ev in _iter_ledger():
            if ev.get("type") != "tx":
                continue
            tx = ev.get("data") or {}
            if not _in_window(tx.get("date"), start_dt, end_dt):
                continue
            method = mkey(tx.get("method"))

            if kind == "sales_by_method":
                price = tx.get("price_eur")
                if price is None:
                    p = tx.get("price_paid")
                    if isinstance(p, (int, float)) and p > 0:
                        price = float(p)
                if not isinstance(price, (int, float)) or price <= 0:
                    continue
                row = agg.setdefault(method, {"count": 0, "total_eur": 0.0})
                row["count"] += 1
                row["total_eur"] += float(price)

            else:  # credits_by_method
                ttype = (tx.get("type") or "").lower()
                ca = tx.get("credits_added")
                # ⚠️ cohérence avec users.json: 'crypto' (pas 'card')
                if isinstance(ca, (int, float)) and ca > 0 and (ttype == "purchase" or method in {"stripe", "paypal", "crypto"}):
                    row = agg.setdefault(method, {"count": 0, "credits": 0})
                    row["count"] += 1
                    row["credits"] += int(ca)

        # 3) Construction du résultat APRÈS consolidation
        out = []
        for k, v in agg.items():
            if "total_eur" in v:
                v["total_eur"] = round(v["total_eur"], 2)
            out.append({"method": k, **v})
        key = "total_eur" if kind == "sales_by_method" else "credits"
        out.sort(key=lambda r: r.get(key, 0), reverse=True)
        return out


        

    if kind == "revenue_by_day":
        buckets = {}
        cur = (start_dt or (_tz_now() - timedelta(days=30))).replace(hour=0, minute=0, second=0, microsecond=0)
        endp = (end_dt or _tz_now()).replace(hour=23, minute=59, second=59, microsecond=0)
        while cur <= endp:
            buckets[cur.strftime("%Y-%m-%d")] = 0.0
            cur += timedelta(days=1)
        for _, u in users.items():
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                price = tx.get("price_eur")
                if price is None:
                    p = tx.get("price_paid")
                    if isinstance(p, (int, float)) and p > 0:
                        price = float(p)
                if not isinstance(price, (int, float)) or price <= 0:
                    continue
                d = _parse_dt_any(tx.get("date"))
                key = d.strftime("%Y-%m-%d")
                if key in buckets:
                    buckets[key] += float(price)
        # === Consolidation ledger ===
        for ev in _iter_ledger():
            if ev.get("type") != "tx":
                continue
            tx = ev.get("data") or {}
            if not _in_window(tx.get("date"), start_dt, end_dt):
                continue
            price = _price_eur(tx)
            if not isinstance(price, (int, float)) or price <= 0:
                continue
            day = _parse_dt_any(tx.get("date")).strftime("%Y-%m-%d")
            if day in buckets:
                buckets[day] += float(price)

        return [{"x": k, "y": round(v, 2)} for k, v in buckets.items()]

    # --------- NOUVEAUX ---------

    if kind == "revenue_by_hour":
        # 24 buckets 0..23
        buckets = [{"hour": h, "total_eur": 0.0} for h in builtins.range(24)]
        for _, u in users.items():
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                val = _price_eur(tx)
                if not isinstance(val, (int, float)) or val <= 0:
                    continue
                d = _parse_dt_any(tx.get("date"))
                buckets[d.hour]["total_eur"] += float(val)
        # arrondis pour affichage
        for b in buckets:
            b["total_eur"] = round(b["total_eur"], 2)

        # === Consolidation ledger ===
        # === Consolidation ledger ===
        for ev in _iter_ledger():
            if ev.get("type") != "tx":
                continue
            tx = ev.get("data") or {}
            if not _in_window(tx.get("date"), start_dt, end_dt):
                continue
            price = _price_eur(tx)
            if not isinstance(price, (int, float)) or price <= 0:
                continue
            h = _parse_dt_any(tx.get("date")).hour
            buckets[h]["total_eur"] += float(price)

        # arrondis après consolidation
        for b in buckets:
            b["total_eur"] = round(b["total_eur"], 2)

        return buckets



    if kind == "backtests_by_hour_heatmap":
        labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
        heat = [{"day": i, "label": labels[i], "hours": [0]*24} for i in builtins.range(7)]
        for _, u in users.items():
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                if not _is_backtest(tx):
                    continue
                d = _parse_dt_any(tx.get("date"))
                heat[d.weekday()]["hours"][d.hour] += 1
    
        # === Consolidation ledger ===
        # === Consolidation ledger ===
        for ev in _iter_ledger():
            if ev.get("type") != "tx":
                continue
            tx = ev.get("data") or {}
            if not _in_window(tx.get("date"), start_dt, end_dt):
                continue
            if not _is_backtest(tx):
                continue
            d = _parse_dt_any(tx.get("date"))
            if not d:
                continue
            # map JS getDay() (0=Dim..6=Sam) -> heat idx (0=Lun..6=Dim)
            dow = (d.weekday())  # Python: 0=Lun..6=Dim -> déjà bon
            h = d.hour
            if 0 <= dow <= 6 and 0 <= h <= 23:
                heat[dow]["hours"][h] = (heat[dow]["hours"][h] or 0) + 1

        return heat

    if kind == "backtests_duration_histogram":
        buckets = [
            {"bucket": "0–1s",  "count": 0},
            {"bucket": "1–2s",  "count": 0},
            {"bucket": "2–5s",  "count": 0},
            {"bucket": "5–10s", "count": 0},
            {"bucket": "10–30s","count": 0},
            {"bucket": "30–60s","count": 0},
            {"bucket": ">60s",  "count": 0},
        ]

        def put(sec: float):
            if sec < 1:   buckets[0]["count"] += 1
            elif sec < 2: buckets[1]["count"] += 1
            elif sec < 5: buckets[2]["count"] += 1
            elif sec < 10: buckets[3]["count"] += 1
            elif sec < 30: buckets[4]["count"] += 1
            elif sec < 60: buckets[5]["count"] += 1
            else:         buckets[6]["count"] += 1

        # <<< La boucle d'agrégation DOIT être ici (en dehors de put) >>>
        for _, u in users.items():
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                if not _is_backtest(tx):
                    continue

                # --- récupération robuste de la durée en secondes ---
                sec = None
                ms_val = tx.get("duration_ms")
                if ms_val is None:
                    ms_val = tx.get("elapsed_ms")
                if ms_val is not None:
                    try:
                        sec = float(ms_val) / 1000.0
                    except Exception:
                        sec = None

                if sec is None:
                    s_val = tx.get("duration_s")
                    if s_val is not None:
                        try:
                            sec = float(s_val)
                        except Exception:
                            sec = None
                # -----------------------------------------------------

                if sec is not None and sec >= 0:
                     put(sec)
        # === Consolidation ledger ===
        for ev in _iter_ledger():
            if ev.get("type") != "tx":
                continue
            tx = ev.get("data") or {}
            if not _in_window(tx.get("date"), start_dt, end_dt):
                continue
            if not _is_backtest(tx):
                continue

            sec = None
            ms_val = tx.get("duration_ms") or tx.get("elapsed_ms")
            if ms_val is not None:
                try: sec = float(ms_val) / 1000.0
                except: sec = None
            if sec is None:
                s_val = tx.get("duration_s")
                if s_val is not None:
                    try: sec = float(s_val)
                    except: sec = None
            if sec is not None and sec >= 0:
                put(sec)

        return buckets



    if kind == "credits_flow":
        # par jour: credits_in (achats+bonus), credits_out (backtests*2 ou credits_delta<0)
        buckets = {}
        cur = (start_dt or (_tz_now() - timedelta(days=30))).replace(hour=0, minute=0, second=0, microsecond=0)
        endp = (end_dt or _tz_now()).replace(hour=23, minute=59, second=59, microsecond=0)
        while cur <= endp:
            buckets[cur.strftime("%Y-%m-%d")] = {"credits_in": 0, "credits_out": 0}
            cur += timedelta(days=1)

        for _, u in users.items():
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                d = _parse_dt_any(tx.get("date"))
                key = d.strftime("%Y-%m-%d")
                ca = tx.get("credits_added")
                cd = tx.get("credits_delta")  # si tu enregistres les débits en négatif
                ttype = (tx.get("type") or "").lower()
                method = (tx.get("method") or "").lower()
                label = (tx.get("label") or "").lower()

                # entrants
                if isinstance(ca, (int, float)) and ca > 0 and (ttype == "purchase" or method in {"stripe","paypal","crypto"} or "bonus" in label or "mensuel" in label or "offert" in label):
                    buckets[key]["credits_in"] += int(ca)

                # sortants
                if isinstance(cd, (int, float)) and cd < 0:
                    buckets[key]["credits_out"] += int(abs(cd))
                elif _is_backtest(tx):
                    # si pas de delta, on débite 2 par backtest (règle métier)
                    buckets[key]["credits_out"] += 2
        # === Consolidation ledger ===
        for ev in _iter_ledger():
            if ev.get("type") != "tx":
                continue
            tx = ev.get("data") or {}
            if not _in_window(tx.get("date"), start_dt, end_dt):
                continue

            d = _parse_dt_any(tx.get("date"))
            if not d:
                continue
            key = d.strftime("%Y-%m-%d")
            if key not in buckets:
                continue

            ca = tx.get("credits_added")
            cd = tx.get("credits_delta")
            ttype = (tx.get("type") or "").lower()
            method = (tx.get("method") or "").lower()
            label  = (tx.get("label") or "").lower()

            # entrants
            if isinstance(ca, (int, float)) and ca > 0 and (
                ttype == "purchase" or method in {"stripe","paypal","crypto"}
                or "bonus" in label or "mensuel" in label or "offert" in label
            ):
                buckets[key]["credits_in"] += int(ca)

            # sortants
            if isinstance(cd, (int, float)) and cd < 0:
                buckets[key]["credits_out"] += int(abs(cd))
            elif _is_backtest(tx):
                # règle métier: si pas de delta explicite, débiter 2
                buckets[key]["credits_out"] += 2

        out = []
        for k, v in buckets.items():
            out.append({"day": k, "in": v["credits_in"], "out": v["credits_out"], "net": v["credits_in"] - v["credits_out"]})
        return out

    if kind == "active_users_daily":
        # utilisateurs "actifs" (last_seen dans la journée OU activité transactionnelle)
        buckets = {}
        cur = (start_dt or (_tz_now() - timedelta(days=30))).replace(hour=0, minute=0, second=0, microsecond=0)
        endp = (end_dt or _tz_now()).replace(hour=23, minute=59, second=59, microsecond=0)
        while cur <= endp:
            buckets[cur.strftime("%Y-%m-%d")] = set()
            cur += timedelta(days=1)

        for uid, u in users.items():
            # last_seen
            ls = u.get("last_seen")
            dls = _parse_dt_any(ls) if ls else None
            if dls:
                key = dls.strftime("%Y-%m-%d")
                if key in buckets:
                    buckets[key].add(uid)
            # activité via transactions
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                d = _parse_dt_any(tx.get("date"))
                key = d.strftime("%Y-%m-%d")
                if key in buckets:
                    buckets[key].add(uid)

        return [{"x": day, "y": len(uids)} for day, uids in buckets.items()]

    if kind == "dau_wau_mau":
        now = _tz_now()
        d1 = now - timedelta(days=1)
        w1 = now - timedelta(days=7)
        m1 = now - timedelta(days=30)
        dau = wau = mau = 0
        for _, u in users.items():
            ls = u.get("last_seen") or u.get("date")
            dt = _parse_dt_any(ls) if ls else None
            # fallback: dernière transaction
            if not dt:
                for tx in (u.get("purchase_history") or []):
                    dtx = _parse_dt_any(tx.get("date"))
                    if dtx and (not dt or dtx > dt):
                        dt = dtx
            if not dt:
                continue
            if dt >= d1: dau += 1
            if dt >= w1: wau += 1
            if dt >= m1: mau += 1
        return [{"metric": "DAU", "count": dau}, {"metric": "WAU", "count": wau}, {"metric": "MAU", "count": mau}]

    if kind == "top_customers":
        agg = {}
        for _, u in users.items():
            uname = u.get("username") or u.get("email")
            sales = 0.0
            orders = 0
            credits = 0
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                price = tx.get("price_eur")
                if price is None:
                    p = tx.get("price_paid")
                    if isinstance(p, (int, float)) and p > 0:
                        price = float(p)
                if isinstance(price, (int, float)) and price > 0:
                    sales += float(price)
                    orders += 1
                ca = tx.get("credits_added")
                method = (tx.get("method") or "").lower()
                ttype  = (tx.get("type") or "").lower()
                if isinstance(ca, (int, float)) and ca > 0 and (ttype == "purchase" or method in {"stripe","paypal","crypto"}):
                    credits += int(ca)
            if sales > 0 or orders > 0 or credits > 0:
                entry = agg.setdefault(uname, {"user": uname, "orders": 0, "sales_eur": 0.0, "credits": 0})
                entry["orders"] += orders
                entry["sales_eur"] += sales
                entry["credits"] += credits
        out = list(agg.values())
        for r in out:
            r["sales_eur"] = round(r["sales_eur"], 2)
        out.sort(key=lambda r: (r["sales_eur"], r["orders"]), reverse=True)
        return out[: max(1, min(200, int(limit)))]
    

    if kind in {"backtests_by_strategy", "backtests_by_symbol", "backtests_by_timeframe"}:
        keyname = (
            "strategy"  if kind == "backtests_by_strategy"  else
            "symbol"    if kind == "backtests_by_symbol"    else
            "timeframe"
        )
        agg = {}

        # 1) users.json
        for _, u in users.items():
            for tx in (u.get("purchase_history") or []):
                if not _in_window(tx.get("date"), start_dt, end_dt):
                    continue
                if not _is_backtest(tx):
                    continue
                k = tx.get(keyname) or "—"
                agg[k] = agg.get(k, 0) + 1

        # 2) ledger (utilisateurs supprimés inclus)
        for ev in _iter_ledger():
            if ev.get("type") != "tx":
                continue
            tx = ev.get("data") or {}
            if not _in_window(tx.get("date"), start_dt, end_dt):
                continue
            if not _is_backtest(tx):
                continue
            k = (
                tx.get("strategy")  if kind == "backtests_by_strategy" else
                tx.get("symbol")    if kind == "backtests_by_symbol"   else
                tx.get("timeframe")
            ) or "—"
            agg[k] = agg.get(k, 0) + 1

        # 3) construire la sortie APRÈS consolidation
        out = [{"key": k, "count": v} for k, v in agg.items()]
        out.sort(key=lambda r: r["count"], reverse=True)
        return out


# BACKTRADZ 2025-09-07: détails "tous les utilisateurs" (avec période optionnelle)
@stats_router.get("/admin/metrics/details/users_all")
def details_users_all(
    range: str = "all",
    request: Request = None,
    start: str | None = None,
    end: str | None = None
):
    _ = _admin_guard(request)
    start_dt, end_dt = _bounds_from_range_or_custom(range, start, end)
    users = _load_users_json()
    rows = []

    for uid, u in users.items():
        # 1) date de création "officielle"
        created_raw = u.get("created_at") or u.get("signup_date") or u.get("date")
        dt = _parse_dt_any(created_raw) if created_raw else None

        # 2) fallback: première transaction si aucune date
        if not dt:
            first = None
            for tx in (u.get("purchase_history") or []):
                dtx = _parse_dt_any(tx.get("date"))
                if dtx and (first is None or dtx < first):
                    first = dtx
            dt = first

        # 3) filtre de période seulement si une borne de début est fournie
        if start_dt and (not dt or not _in_window(dt.isoformat(), start_dt, end_dt)):
            continue

        # 4) last_seen formaté
        ls = u.get("last_seen")
        ls_fmt = _parse_dt_any(ls).strftime("%Y-%m-%d %H:%M:%S") if ls else ""

        rows.append({
            "date": dt.strftime("%Y-%m-%d %H:%M:%S") if dt else "",
            "email": u.get("email"),
            "username": u.get("username"),
            "plan": u.get("plan", "free"),
            "credits": int(u.get("credits", 0) or 0),
            "last_seen": ls_fmt,
        })

    rows.sort(key=lambda r: r["date"] or "", reverse=True)
    return rows

@stats_router.post("/admin/metrics/reset")
def metrics_reset(request: Request):
    _ = _admin_guard(request)
    # Purge soft: on vide le ledger (append-only) et on renvoie ok
    try:
        AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
        if AUDIT_FILE.exists():
            AUDIT_FILE.write_text("", encoding="utf-8")
        return {"status": "ok", "message": "Ledger purgé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset KO: {e}")

@stats_router.post("/admin/metrics/rebuild_from_users")
def metrics_rebuild_from_users(request: Request):
    """
    Optionnel: reconstituer un ledger depuis le purchase_history des users,
    au format 'tx' minimal pour les analytics (utile après purge).
    """
    _ = _admin_guard(request)
    import json as _json
    users = _load_users_json()
    AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            for uid, u in users.items():
                for tx in (u.get("purchase_history") or []):
                    evt = {"type": "tx", "user_id": uid, "data": tx, "ts": (_tz_now().isoformat())}
                    f.write(_json.dumps(evt, ensure_ascii=False) + "\n")
        return {"status": "ok", "message": "Ledger reconstruit depuis users.json"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rebuild KO: {e}")


@stats_router.post("/admin/metrics/full_reset")
def metrics_full_reset(request: Request):
    """
    🔄 Reset complet des stats admin.
    - Vide le ledger (transactions / backtests / events)
    - NE TOUCHE PAS aux abonnements actifs ni aux crédits utilisateurs
    - Utilisé uniquement avant un déploiement (prod reset)
    """
    _ = _admin_guard(request)
    try:
        # 1) reset ledger
        AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
        if AUDIT_FILE.exists():
            AUDIT_FILE.write_text("", encoding="utf-8")

        # 2) reset purchase_history de chaque user (mais garde abo + credits)
        users = _load_users_json()
        changed = False
        for uid, u in users.items():
            if u.get("purchase_history"):
                u["purchase_history"] = []
                changed = True
        if changed:
            USERS_FILE.write_text(json.dumps(users, indent=2, ensure_ascii=False), encoding="utf-8")

        return {"status": "ok", "message": "Stats + purchase_history réinitialisés (abonnements conservés)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full reset KO: {e}")
