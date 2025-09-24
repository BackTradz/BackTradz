# routes/support_route.py
"""
Support / Feedback endpoint
- POST /api/support
- Envoi via Resend avec sujet explicite (Assistance | Améliorations/Bug)
- Reply-To = email utilisateur
- Tags Resend "slugifiés" (ASCII, _, -) pour éviter les 502
"""


from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional, Dict
import os
import re
import unicodedata
from app.utils.email_sender import send_email_html
from app.utils.email_templates import BRAND_NAME  # pour le sujet

SUPPORT_INBOX = os.getenv("SUPPORT_INBOX")  # ex: support@backtradz.com
router = APIRouter(prefix="/support", tags=["support"])

# ========= Payload =========
class SupportPayload(BaseModel):
  type: Literal["contact", "feedback"]
  firstName: str = Field(..., min_length=1, max_length=120)
  lastName:  str = Field(..., min_length=1, max_length=120)
  email:     EmailStr
  message:   str = Field(..., min_length=6, max_length=10_000)
  meta: Optional[Dict] = None  # e.g. {"path": "...", "ts": 1712345678, "userId": "...", "plan": "pro"}


# ========= Helpers =========
def _label_and_emoji(kind: Literal["contact", "feedback"]) -> tuple[str, str]:
  """ Libellé lisible + emoji selon l’onglet UI. """
  return ("Assistance", "💬") if kind == "contact" else ("Améliorations/Bug", "🛠️")

def _build_subject(p: SupportPayload) -> str:
  """ Sujet explicite pour tri en inbox. """
  label, emoji = _label_and_emoji(p.type)
  first = (p.firstName or "").strip()
  last  = (p.lastName  or "").strip()
  return f"{emoji} [{BRAND_NAME} • {label}] {last} {first}".strip()

_slug_re = re.compile(r"[^a-z0-9_-]+")
def _slugify_tag(value: str) -> str:
  """
  Convertit un texte en tag Resend valide:
  - ASCII only, minuscules
  - remplace tout caractère non [a-z0-9_-] par '-'
  - compacte les '-'
  """
  if not value:
    return "na"
  # translit accents → ascii
  val = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
  val = val.lower()
  val = _slug_re.sub("-", val).strip("-")
  return val or "na"

def _build_text_body(p: SupportPayload) -> str:
  """ Corps en texte brut (compat universelle). """
  label, _ = _label_and_emoji(p.type)
  meta_str = p.meta or {}
  return f"""Formulaire : {label}
Type : {p.type}
Nom : {p.lastName}
Prénom : {p.firstName}
Email : {p.email}

Message :
{p.message}

Meta : {meta_str}
""".strip()


# ========= Endpoint support  =========
@router.post("", summary="Envoi d’un message de support/feedback", response_model=dict)
def send_support(payload: SupportPayload):
  # Pré-conditions (env)
  if not SUPPORT_INBOX:
    raise HTTPException(500, "Support indisponible : SUPPORT_INBOX manquant.")

  subject   = _build_subject(payload)
  body_text = _build_text_body(payload)
  body_html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.6">
      <div><b>Formulaire :</b> {_label_and_emoji(payload.type)[0]}</div>
      <div><b>Nom :</b> {payload.lastName}</div>
      <div><b>Prénom :</b> {payload.firstName}</div>
      <div><b>Email :</b> {payload.email}</div>
      <hr style="border:none;border-top:1px solid #ddd;margin:12px 0" />
      <div style="white-space:pre-wrap">{payload.message}</div>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
      <div style="opacity:.7"><b>Meta :</b> {payload.meta or {}}</div>
    </div>
  """.strip()

  ok = send_email_html(
    to_email=SUPPORT_INBOX,
    subject=subject,
    html_body=body_html,
    text_fallback=body_text,
    reply_to=str(payload.email)
  )
  if not ok:
    raise HTTPException(502, "Envoi impossible : configuration SMTP invalide ou indisponible.")
  return {"ok": True}


def _raise_email_error(exc: Exception) -> None:
  """Log + réponse HTTP propre vers le front."""
  import traceback
  print("RESEND ERROR:", repr(exc))
  traceback.print_exc()
  msg = getattr(exc, "message", None) or str(exc) or "Erreur inconnue."
  # Message lisible côté client (sans jargon quand c'est possible)
  if "api key" in msg.lower():
    msg = "Configuration email incomplète (clé API)."
  raise HTTPException(status_code=502, detail=f"Envoi impossible : {msg}")
