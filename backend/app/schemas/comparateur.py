# app/schemas/comparateur.py
from typing import List, Optional, Literal
from pydantic import Field
from app.schemas.communs import BacktradzModel, Metric

class CompareOptionsItem(BacktradzModel):
    id: str
    label: str
    pair: str
    symbol: Optional[str] = None
    period: str
    created_at: Optional[str] = None  # ISO si dispo
    trades_count: Optional[int] = None
    winrate_tp1: Optional[float] = None  # 0..1
    winrate_tp2: Optional[float] = None  # 0..1

class CompareOptionsResponse(BacktradzModel):
    items: List[CompareOptionsItem]

class CompareDataRequest(BacktradzModel):
    analysis_ids: List[str] = Field(..., min_length=1, max_length=4)
    metric: Metric
    normalize: bool = False  # réservé pour plus tard

class SeriesItem(BacktradzModel):
    analysis_id: str
    label: str
    values: List[Optional[float]]

class CompareDataResponse(BacktradzModel):
    metric: Metric
    value_type: Literal["percentage", "count"] = "percentage"
    precision: int = 2
    buckets: List[str]
    series: List[SeriesItem]
