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
from app.utils.email_sender import send_email_html
from app.services.support_service import (
    SUPPORT_INBOX,
    _label_and_emoji, _build_subject, _slugify_tag, _build_text_body, SupportPayload
)

router = APIRouter(prefix="/support", tags=["support"])

# ========= Payload =========
class SupportPayload(SupportPayload):  # conserve mêmes contraintes via Pydantic du service
  firstName: str = Field(..., min_length=1, max_length=120)
  lastName:  str = Field(..., min_length=1, max_length=120)
  email:     EmailStr
  message:   str = Field(..., min_length=6, max_length=10_000)
  meta: Optional[Dict] = None

## Helpers déplacés dans app/services/support_service.py

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
