# backend/routes/meta_routes.py
from fastapi import APIRouter, Query
from app.services.meta_service import get_pip_value

router = APIRouter()

@router.get("/pip")
def get_pip_meta(symbol: str = Query(..., min_length=2)):
    pip = get_pip_value(symbol)
    return {"symbol": symbol, "pip": pip}
