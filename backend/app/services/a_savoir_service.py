# backend/app/services/a_savoir_service.py  (NEW)
"""
 File: backend/app/services/a_savoir_service.py
 Role: Logique métier pour la page 'À savoir' (préparation du contexte).
 Security: Public (pas d'auth).
 Side-effects: Aucun.
"""
from fastapi import Request

def get_a_savoir_context(request: Request) -> dict:
     """
     Construit le contexte à passer au renderer (TemplateResponse).
     ⚠️ On conserve "request" pour compat Jinja2/FastAPI si utilisé.
     """
     return {
         "request": request,
         # 🔧 Extensible sans toucher la route (ex: flags, version, metrics...)
     }

 # (Optionnel) Si un jour tu passes 100% JSON :
 # def get_a_savoir_payload() -> dict:
 #     return {"page": "a_savoir", "ok": True