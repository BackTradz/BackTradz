# app/routes/comparateur_routes.py
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.schemas.comparateur import (
    CompareOptionsResponse, CompareDataRequest, CompareDataResponse
)
from app.services.comparateur_service import (
    list_user_compare_options, build_compare_series
)
from app.models.users import get_user_by_token  # déjà utilisé ailleurs

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
    uid = str(getattr(user, "id", "") or "").strip()
    if not uid:
        raise HTTPException(status_code=403, detail="User not found")
    return uid

@router.get("/options", response_model=CompareOptionsResponse)
def get_compare_options(authorization: Optional[str] = Header(None, alias="X-API-Key")):
    user_id = _current_user_id_from_header(authorization)
    return list_user_compare_options(user_id)

@router.post("/data", response_model=CompareDataResponse)
def post_compare_data(payload: CompareDataRequest, authorization: Optional[str] = Header(None, alias="X-API-Key")):
    user_id = _current_user_id_from_header(authorization)
    if len(payload.analysis_ids) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 analyses.")
    return build_compare_series(user_id, payload)
