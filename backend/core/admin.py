# backend/core/admin.py
# ------------------------------------------------------------
# Source of truth pour l'admin.
# - Par défaut conserve ton email existant (zéro régression).
# - Peut être étendu via la variable d'env ADMIN_EMAILS="a@x.com,b@y.com".
# - Fournit: is_admin_user(user), require_admin(request),
#            require_admin_from_request_or_query(request)
# ------------------------------------------------------------
import os
from fastapi import HTTPException, Request
from backend.models.users import get_user_by_token
import os

# ✅ Active/désactive le support query ?apiKey= en fonction de l'env
ALLOW_QUERY = os.getenv("ADMIN_ALLOW_QUERY_APIKEY", "false").lower() in {"1", "true", "yes"}


# ✅ Zéro régression: ton email reste autorisé par défaut,
#    même si ADMIN_EMAILS n'est pas défini.
_DEFAULT_ADMIN = "BackTradz@outlook.Com"
_ADMIN_ENV = os.getenv("ADMIN_EMAILS", "").strip()

ADMIN_EMAILS = {
    e.strip().lower()
    for e in (_ADMIN_ENV.split(",") if _ADMIN_ENV else [_DEFAULT_ADMIN])
    if e.strip()
}

def is_admin_user(user) -> bool:
    """Retourne True si l'utilisateur est admin selon la 'source of truth'."""
    if not user:
        return False
    email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
    role  = getattr(user, "role", None) or (user.get("role")  if isinstance(user, dict) else None)
    is_flag = bool(getattr(user, "is_admin", False) or (isinstance(user, dict) and user.get("is_admin")))
    return (
        is_flag
        or (str(role).lower() in {"admin", "superadmin"})
        or (str(email).lower() in ADMIN_EMAILS)
    )

def _get_user_from_request(request: Request):
    """Récupère l'user depuis X-API-Key (header)."""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=403, detail="Token requis")
    user = get_user_by_token(api_key)
    if not user:
        raise HTTPException(status_code=403, detail="Utilisateur non trouvé")
    return user

def require_admin(request: Request):
    """Lève 403 si l’appelant n’est pas admin (header X-API-Key)."""
    user = _get_user_from_request(request)
    if not is_admin_user(user):
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return user

def require_admin_from_request_or_query(request: Request):
    """
    Variante tolérante: accepte aussi ?apiKey=... 
    mais seulement si ADMIN_ALLOW_QUERY_APIKEY est activé.
    """
    api_key = request.headers.get("X-API-Key")

    # 👉 En dev tu peux autoriser query param si ALLOW_QUERY=True
    if not api_key and ALLOW_QUERY:
        api_key = request.query_params.get("apiKey")

    if not api_key:
        raise HTTPException(status_code=403, detail="Token requis")

    user = get_user_by_token(api_key)
    if not user or not is_admin_user(user):
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return user
