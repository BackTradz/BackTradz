"""
File: backend/app/services/support_service.py
Role: Helpers pour l'endpoint support (sujet, tags, corps texte) + env.
"""

import os
import re
import unicodedata
from typing import Literal
from pydantic import BaseModel

from app.utils.email_templates import BRAND_NAME  # pour le sujet

SUPPORT_INBOX = os.getenv("SUPPORT_INBOX")  # ex: support@backtradz.com

# ========= Payload (copie stricte du modèle utilisé en route) =========
class SupportPayload(BaseModel):
    type: Literal["contact", "feedback"]
    firstName: str
    lastName: str
    email: str
    message: str

# ========= Helpers (noms identiques à ceux du fichier route) =========
def _label_and_emoji(kind: Literal["contact", "feedback"]) -> tuple[str, str]:
    return ("Assistance", "💬") if kind == "contact" else ("Améliorations/Bug", "🛠️")

def _build_subject(p: SupportPayload) -> str:
    label, emoji = _label_and_emoji(p.type)
    first = (p.firstName or "").strip()
    last  = (p.lastName  or "").strip()
    return f"{emoji} [{BRAND_NAME} • {label}] {last} {first}".strip()

_slug_re = re.compile(r"[^a-z0-9_-]+")
def _slugify_tag(value: str) -> str:
    if not value:
        return "na"
    val = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    val = val.lower()
    val = _slug_re.sub("-", val).strip("-")
    return val or "na"

def _build_text_body(p: SupportPayload) -> str:
    label, _ = _label_and_emoji(p.type)
    return f"""Formulaire : {label}
Type : {p.type}
Nom : {p.lastName}
Prénom : {p.firstName}
Email : {p.email}

Message :
{p.message}

Meta : {{}}""".strip()
