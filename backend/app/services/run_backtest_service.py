"""
File: backend/app/services/run_backtest_service.py
Role: Helpers utilisés par les routes de backtest (dates, symbol, timeframe).
"""

import re
import pandas as pd
from datetime import datetime, timedelta

DATE_PATTERNS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")
PAIR_RE = re.compile(r'([A-Z0-9]{2,6}[-_/]?[A-Z0-9]{2,6})', re.IGNORECASE)
TF_RE   = re.compile(r'\b(M5|M15|M30|H1|H4|D1)\b', re.IGNORECASE)

def _parse_date_flex(s: str) -> datetime | None:
    if not s: return None
    s = str(s).strip().replace("Z", "")
    if "T" in s: s = s.split("T", 1)[0]
    try:
        return datetime.fromisoformat(s)
    except Exception:
        pass
    for fmt in DATE_PATTERNS:
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            continue
    return None

def _days_inclusive(d1: datetime, d2: datetime) -> int:
    return (d2.date() - d1.date()).days + 1

def _detect_symbol_from_name(name: str) -> str | None:
    if not name: return None
    core = TF_RE.sub(" ", name)
    m = PAIR_RE.search(core.replace(" ", "_"))
    if not m: return None
    sym = m.group(1).upper().replace("/", "-").replace("_", "-")
    if sym.endswith("=X"): sym = sym[:-2]
    if "-" not in sym and len(sym) == 6: sym = sym[:3] + "-" + sym[3:]
    return sym

def _detect_tf_from_name(name: str) -> str | None:
    m = TF_RE.search(name or "")
    return m.group(1).upper() if m else None

def _infer_tf_from_df(df: pd.DataFrame) -> str | None:
    if "time" not in df.columns or len(df) < 3: return None
    s = pd.to_datetime(df["time"], utc=True, errors="coerce").dropna().sort_values()
    if len(s) < 3: return None
    dt = (s.iloc[1:] - s.iloc[:-1]).median()
    if not isinstance(dt, pd.Timedelta): return None
    minutes = int(dt / timedelta(minutes=1))
    mapping = {5:"M5",15:"M15",30:"M30",60:"H1",240:"H4",1440:"D1"}
    return mapping.get(minutes)
