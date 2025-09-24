"""
File: backend/routes/user_profile_routes.py
Role: Pages & actions liées au profil (afficher, modifier, supprimer, se désabonner).
Depends:
  - backend.models.users (get_user_by_token, update_user, delete_user_by_id, cancel_subscription)
  - backend.auth.get_current_user (pour les actions protégées)
  - backend.utils.templates.templates (rendu de user_profile.html)
Side-effects:
  - Lecture/écriture JSON utilisateurs
Security:
  - /profile (GET) accessible via query ?token=... (flux existant côté front)
  - /profile/update, /profile/delete, /profile/unsubscribe protégés
Notes:
  - Garde le flux existant avec 'token' en query pour la page (pas modifié).
"""

from fastapi import APIRouter, Request, Header, Form
from fastapi.responses import RedirectResponse
from starlette.status import HTTP_303_SEE_OTHER
from fastapi.templating import Jinja2Templates
from fastapi import Request, APIRouter, Query
from fastapi.responses import HTMLResponse
from app.utils.templates import templates
from fastapi import Depends
from app.auth import get_current_user
from fastapi.responses import JSONResponse
from app.models.users import (
    User,
    delete_user_by_id,
    get_user_by_token,
    update_user,
    cancel_subscription,
)

import json
import os

from pathlib import Path


router = APIRouter()


@router.get("/profile", response_class=HTMLResponse)
def profile_page(request: Request, token: str = Query(None)):
    """
    Rendu de la page profil via token passé en query (?token=...).

    Si token invalide/absent → redirection vers /login (303).
    """
    if not token:
        return RedirectResponse(url="/login", status_code=303)

    user = get_user_by_token(token)
    if not user:
        return RedirectResponse(url="/login", status_code=303)

    return templates.TemplateResponse("user_profile.html", {
        "request": request, 
        "user": user,
        "token": token
    })

@router.post("/profile/update")
async def update_profile(
    request: Request,
    x_api_key: str = Header(None, alias="X-API-Key"),
    email: str = Form(...),
    full_name: str = Form(...),
    password: str = Form(None)
):
    user = users.get_user_by_token(x_api_key)
    if not user:
        return {"status": "error", "message": "Non authentifié"}

    # ✅ on passe uniquement ce que update_user sait gérer
    updated = update_user(
        user.id,
        email=email.strip(),
        full_name=(full_name or "").strip(),
        password=password
    )

    return {"status": "success"} if updated else {"status": "error", "message": "Erreur de mise à jour"}



@router.post("/profile/delete")
async def delete_account(user: User = Depends(get_current_user)):
    """
    Supprime définitivement le compte de l'utilisateur courant.
    """
    deleted = delete_user_by_id(user.id)
    if deleted:
        return {"status": "success"}
    return {"status": "error", "message": "Impossible de supprimer le compte"}


@router.post("/profile/unsubscribe")
async def unsubscribe(user: User = Depends(get_current_user)):
    """
    Annule l'abonnement (si présent) de l'utilisateur courant.
    """
    success = cancel_subscription(user.id)
    if success:
        return {"status": "success"}
    return {"status": "error", "message": "Impossible de se désabonner"}