# backend/routes/meta_routes.py
from fastapi import APIRouter, Query
from backend.utils.pip_registry import get_pip

router = APIRouter()

@router.get("/pip")
def get_pip_meta(symbol: str = Query(..., min_length=2)):
    pip = get_pip(symbol)
    return {"symbol": symbol, "pip": pip}
