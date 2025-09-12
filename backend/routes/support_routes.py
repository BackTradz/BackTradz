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
import resend

# ========= Config =========
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
SUPPORT_INBOX  = os.getenv("SUPPORT_INBOX")
SUPPORT_FROM   = os.getenv("SUPPORT_FROM", SUPPORT_INBOX)  # fallback

if RESEND_API_KEY:
  resend.api_key = RESEND_API_KEY

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
  return f"{emoji} [BackTradz • {label}] {last} {first}".strip()

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


# ========= Endpoint =========
@router.post("", summary="Envoi d’un message de support/feedback", response_model=dict)
def send_support(payload: SupportPayload):
  # Pré-conditions (env)
  if not SUPPORT_INBOX:
    raise HTTPException(500, "Support indisponible : adresse de réception manquante (SUPPORT_INBOX).")
  if not RESEND_API_KEY:
    raise HTTPException(500, "Support indisponible : RESEND_API_KEY manquante (provider email).")

  subject   = _build_subject(payload)
  body_text = _build_text_body(payload)

  # Tags Resend **valides**
  label, _ = _label_and_emoji(payload.type)
  tags = [
    {"name": "form",  "value": _slugify_tag(payload.type)},   # "contact" | "feedback"
    {"name": "label", "value": _slugify_tag(label)},          # "assistance" | "ameliorations-bug"
  ]

  try:
    resend.Emails.send({
      "from": SUPPORT_FROM,
      "to": [SUPPORT_INBOX],
      "reply_to": payload.email,
      "subject": subject,
      "text": body_text,
      "tags": tags,  # ✅ ASCII only
    })
    return {"ok": True}

  except Exception as e:
    # Si l’erreur vient des tags (ex: "Tags should only contain…"), on retente SANS tags.
    detail = (getattr(e, "message", None) or str(e) or "").lower()
    try_tags_failed = "tags" in detail and "contain" in detail
    if try_tags_failed:
      try:
        resend.Emails.send({
          "from": SUPPORT_FROM,
          "to": [SUPPORT_INBOX],
          "reply_to": payload.email,
          "subject": subject,
          "text": body_text,
          # no tags
        })
        return {"ok": True, "warn": "tags_removed"}
      except Exception as e2:
        _raise_email_error(e2)

    _raise_email_error(e)


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
