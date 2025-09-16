# backend/utils/invoice_generator.py
# ============================================================
# 🔖 Invoice Generator (JSON + HTML)
# - Aucune dépendance externe (pas de PDF à ce stade).
# - Écrit dans: DATA_ROOT/private/invoices/YYYY/MM/INV-YYYYMM-0001.{json,html}
# - Numérotation persistante via: DATA_ROOT/private/invoices/.invoice_index.json
# - Zéro régression: purement additif, pas d'effet sur tes flux existants.
# ============================================================

from __future__ import annotations
from pathlib import Path
import json, datetime, re
from typing import Dict, Any, Optional, List
# backend/utils/invoice_generator.py
from backend.core.paths import INVOICES_DIR  # + DATA_ROOT si besoin debug

# Racine pour les factures (→ "mois" = YYYY/MM) — disque privé
FACTURE_ROOT = INVOICES_DIR
INDEX_FILE   = INVOICES_DIR / ".invoice_index.json"

# --- Infos "société" de secours (si tu n’en as pas encore dans une config centrale)
FALLBACK_COMPANY = {
    "name": "BackTradz",
    "vat_number": "N/A",
    "address_lines": ["—", "—"],
    "email": "support@backtradz.app",
    "website": "https://backtradz.app"
}

def _sanitize(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"[\r\n\t]+", " ", str(s)).strip()

def _iso(dt: Optional[datetime.datetime]) -> str:
    if isinstance(dt, datetime.datetime):
        return dt.replace(microsecond=0).isoformat()
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat()

def _ensure_month_dir(root: Path, now: datetime.datetime) -> Path:
    out = root / now.strftime("%Y") / now.strftime("%m")
    out.mkdir(parents=True, exist_ok=True)
    return out

def _load_index() -> dict:
    if INDEX_FILE.exists():
        try:
            return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def _save_index(data: dict) -> None:
    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def _next_invoice_number(now: datetime.datetime) -> str:
    """
    Format: INV-YYYYMM-####  (compteur mensuel)
    """
    idx = _load_index()
    key = now.strftime("%Y%m")
    seq = int(idx.get(key, 0)) + 1
    idx[key] = seq
    _save_index(idx)
    return f"INV-{key}-{seq:04d}"

def _resolve_company(project_config: Optional[dict]) -> dict:
    if not project_config:
        return FALLBACK_COMPANY
    return {
        "name": project_config.get("COMPANY_NAME", FALLBACK_COMPANY["name"]),
        "vat_number": project_config.get("VAT_NUMBER", FALLBACK_COMPANY["vat_number"]),
        "address_lines": project_config.get("COMPANY_ADDRESS", FALLBACK_COMPANY["address_lines"]),
        "email": project_config.get("COMPANY_EMAIL", FALLBACK_COMPANY["email"]),
        "website": project_config.get("COMPANY_WEBSITE", FALLBACK_COMPANY["website"]),
    }

def create_invoice(
    *,
    user_id: str,
    email: str,
    full_name: Optional[str],
    method: str,                 # "Stripe" | "PayPal" | "Crypto" | ...
    transaction_id: str,         # id charge / order / tx
    amount: float,               # TTC en EUR (ou devise choisie)
    currency: str = "EUR",
    items: List[dict],           # [{"sku","label","qty","unit_amount"}]
    created_at: Optional[datetime.datetime] = None,
    billing_address: Optional[dict] = None,  # {"line1","line2","zip","city","country"}
    tax: Optional[dict] = None,              # {"rate": float, "amount": float}
    project_config: Optional[dict] = None,
) -> Dict[str, Any]:
    """
    Génère deux fichiers:
      - JSON: données structurées de la facture
      - HTML: rendu minimal prêt à être envoyé par mail (plus tard)
    Retourne les chemins générés.
    """
    now = created_at or datetime.datetime.utcnow()
    inv_id = _next_invoice_number(now)
    company = _resolve_company(project_config)

    tax_rate = float(tax.get("rate")) if tax else 0.0
    tax_amount = float(tax.get("amount")) if tax else 0.0
    total_ttc = round(float(amount), 2)
    total_ht  = round(total_ttc - tax_amount, 2) if tax else total_ttc

    customer_name = _sanitize(full_name) or _sanitize(email.split("@")[0])

    out_dir = _ensure_month_dir(FACTURE_ROOT, now)

    data = {
        "invoice_id": inv_id,
        "issued_at": _iso(now),
        "company": company,
        "customer": {
            "user_id": user_id,
            "name": customer_name,
            "email": _sanitize(email),
            "billing_address": billing_address or {},
        },
        "payment": {
            "method": method,
            "transaction_id": _sanitize(transaction_id),
            "currency": (currency or "EUR").upper(),
        },
        "items": items or [],
        "amounts": {
            "total_ht": total_ht,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "total_ttc": total_ttc,
        },
        "meta": {
            "note": "Facture générée automatiquement – BackTradz",
            "version": 1,
        },
    }

    # Écrit JSON
    json_path = out_dir / f"{inv_id}.json"
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # Écrit HTML
    html = _render_html(data)
    html_path = out_dir / f"{inv_id}.html"
    html_path.write_text(html, encoding="utf-8")

    return {
        "ok": True,
        "invoice_id": inv_id,
        "json_path": str(json_path),
        "html_path": str(html_path),
        "dir": str(out_dir),
    }

def _render_html(d: Dict[str, Any]) -> str:
    c = d["company"]; cust = d["customer"]; pay = d["payment"]; amt = d["amounts"]
    def esc(x): return _sanitize(str(x))
    rows = []
    for it in d.get("items", []):
        qty = int(it.get("qty", 1))
        unit = float(it.get("unit_amount", 0.0))
        rows.append(f"""
        <tr>
          <td>{esc(it.get('label',''))}</td>
          <td style="text-align:center;">{qty}</td>
          <td style="text-align:right;">{unit:.2f} {esc(pay['currency'])}</td>
          <td style="text-align:right;">{qty*unit:.2f} {esc(pay['currency'])}</td>
        </tr>""")
    if not rows:
        rows.append("""<tr><td colspan="4" style="text-align:center;opacity:.7;">—</td></tr>""")

    addr = cust.get("billing_address") or {}
    addr_lines = "<br>".join(filter(None, [
        esc(addr.get("line1","")), esc(addr.get("line2","")),
        f"{esc(addr.get('zip',''))} {esc(addr.get('city',''))}", esc(addr.get("country",""))
    ]))

    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>{esc(d['invoice_id'])} — Facture</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{{font-family:Arial,Helvetica,sans-serif;background:#0b0f14;color:#e6e9ee;margin:0;padding:24px;}}
  .card{{max-width:820px;margin:0 auto;background:#121821;border:1px solid #1f2937;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.25);overflow:hidden;}}
  .header{{display:flex;justify-content:space-between;gap:16px;padding:20px 24px;border-bottom:1px solid #1f2937;background:linear-gradient(135deg,#0f172a,#0b1220);}}
  .brand h1{{margin:0;font-size:18px;letter-spacing:.5px;}}
  .muted{{opacity:.7;font-size:13px;}}
  .section{{padding:20px 24px;border-bottom:1px solid #1f2937;}}
  table{{width:100%;border-collapse:collapse;}}
  th,td{{padding:10px;border-bottom:1px solid #1f2937;}}
  th{{text-align:left;opacity:.8;font-weight:600;font-size:13px;}}
  .totals td{{border:none;padding:6px 10px;}}
  .right{{text-align:right;}}
  .badge{{display:inline-block;padding:4px 10px;border:1px solid #334155;border-radius:999px;font-size:12px;}}
  .footer{{padding:16px 24px;font-size:12px;opacity:.7;}}
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">
        <h1>{esc(c['name'])}</h1>
        <div class="muted">TVA: {esc(c['vat_number'])}</div>
        <div class="muted">{esc(' / '.join(c.get('address_lines',[]) or []))}</div>
        <div class="muted">{esc(c['email'])} · {esc(c['website'])}</div>
      </div>
      <div style="text-align:right;">
        <div class="badge">{esc(d['invoice_id'])}</div>
        <div class="muted">Émis le {esc(d['issued_at'])}</div>
        <div class="muted">Méthode: {esc(pay['method'])}</div>
        <div class="muted">Txn: {esc(pay['transaction_id'])}</div>
      </div>
    </div>

    <div class="section" style="display:flex;gap:24px;flex-wrap:wrap;">
      <div style="flex:1 1 280px;">
        <div class="muted" style="margin-bottom:6px;">Facturé à</div>
        <div style="font-weight:600;">{esc(cust['name'])}</div>
        <div class="muted">{esc(cust['email'])}</div>
        <div class="muted" style="margin-top:6px;">{addr_lines}</div>
      </div>
      <div style="flex:1 1 180px;">
        <div class="muted" style="margin-bottom:6px;">Devise</div>
        <div class="badge">{esc(pay['currency'])}</div>
      </div>
    </div>

    <div class="section">
      <table>
        <thead>
          <tr><th>Description</th><th style="text-align:center;">Qté</th><th class="right">PU</th><th class="right">Total</th></tr>
        </thead>
        <tbody>
          {''.join(rows)}
        </tbody>
      </table>
    </div>

    <div class="section" style="display:flex;justify-content:flex-end;">
      <table class="totals" style="width:auto;">
        <tr><td class="right">Total HT</td><td class="right">{amt['total_ht']:.2f} {esc(pay['currency'])}</td></tr>
        <tr><td class="right">TVA ({amt['tax_rate']:.2f}%)</td><td class="right">{amt['tax_amount']:.2f} {esc(pay['currency'])}</td></tr>
        <tr><td class="right" style="font-weight:700;">Total TTC</td><td class="right" style="font-weight:700;">{amt['total_ttc']:.2f} {esc(pay['currency'])}</td></tr>
      </table>
    </div>

    <div class="footer">
      Paiement confirmé. Conservez cette facture pour vos dossiers comptables. Merci — BackTradz.
    </div>
  </div>
</body>
</html>"""
