# app/routes/comparateur_routes.py
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional

from app.schemas.comparateur import (
    CompareOptionsResponse, CompareDataRequest, CompareDataResponse
)
from app.services.comparateur_service import (
    list_user_compare_options, build_compare_series
)
from app.models.users import get_user_by_token  # déjà utilisé ailleurs
from app.auth import get_current_user


router = APIRouter(prefix="/compare", tags=["compare"])

def _current_user_id_from_header(authorization: Optional[str]) -> str:
    """
    On récupère le user via le même mécanisme que tes autres routes:
    - header 'X-API-Key' (alias 'authorization' dans la signature)
    - get_user_by_token(token) → User | None
    """
    token = (authorization or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing X-API-Key")
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    # ✨ tolérant: objet pydantic OU dict imbriqué
    uid = (
        getattr(user, "id", None)
        or (user.get("id") if isinstance(user, dict) else None)
        or (user.get("user", {}).get("id") if isinstance(user, dict) else None)
    )
    uid = str(uid or "").strip()
    if not uid:
        raise HTTPException(status_code=403, detail="User not found")
    return uid

def _resolve_user_id(authorization: Optional[str], user) -> str:
    """
    Source de vérité = get_current_user (même que le dashboard).
    Fallback header X-API-Key si dépendance indisponible.
    """
    try:
        if user and getattr(user, "id", None):
            return str(user.id)
    except Exception:
        pass
    return _current_user_id_from_header(authorization)

@router.get("/options", response_model=CompareOptionsResponse)
def get_compare_options(
    authorization: Optional[str] = Header(None, alias="X-API-Key"),
    user=Depends(get_current_user),
):
    user_id = _resolve_user_id(authorization, user)
    return list_user_compare_options(user_id)
@router.post("/data", response_model=CompareDataResponse)
def post_compare_data(
    payload: CompareDataRequest,
    authorization: Optional[str] = Header(None, alias="X-API-Key"),
    user=Depends(get_current_user),
):
    user_id = _resolve_user_id(authorization, user)
    if len(payload.analysis_ids) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 analyses.")
    return build_compare_series(user_id, payload)
