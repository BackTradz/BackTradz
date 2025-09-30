# app/services/comparateur_service.py
"""
Service comparateur:
- Liste d’analyses 'options' pour l'user courant (select multi côté front)
- Construction de séries normalisées à partir des CSV déjà générés:
    *_global.csv
    *_sessions.csv
    *_par_heure.csv
    *_jour_semaine.csv
- Sécurité: filtre par ownership via params*.json (user_id/run_user.id) si présent
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
import pandas as pd

from app.core.paths import ANALYSIS_DIR
from app.schemas.comparateur import (
    CompareOptionsItem, CompareOptionsResponse,
    CompareDataRequest, CompareDataResponse, SeriesItem
)
from app.schemas.communs import DEFAULT_SESSIONS, DEFAULT_DAYS, DEFAULT_HOURS

# ------------ Helpers lecture disque ------------

def _find_runs(root: Path) -> List[Path]:
    """
    Retourne les dossiers d’analyse (runs) sous ANALYSIS_DIR.
    Un 'run' contient au moins un *_global.csv.
    """
    runs: List[Path] = []
    if not root.exists():
        return runs
    for p in root.rglob("*_global.csv"):
        runs.append(p.parent)
    runs = sorted(set(runs), key=lambda d: d.stat().st_mtime, reverse=True)
    return runs

def _load_params(run_dir: Path) -> dict:
    """Lit le params*.json le plus récent s’il existe (meta du run)."""
    meta_files = sorted(run_dir.glob("params*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not meta_files:
        return {}
    try:
        return json.loads(meta_files[0].read_text(encoding="utf-8"))
    except Exception:
        return {}

def _safe_read_csv(path: Path) -> Optional[pd.DataFrame]:
    try:
        return pd.read_csv(path)
    except Exception:
        return None

def _detect_files(run_dir: Path) -> Dict[str, Optional[Path]]:
    files = {"global": None, "sessions": None, "hour": None, "day": None}
    for f in run_dir.glob("*_global.csv"):       files["global"] = f;   break
    for f in run_dir.glob("*_sessions.csv"):     files["sessions"] = f; break
    for f in run_dir.glob("*_par_heure.csv"):    files["hour"] = f;     break
    for f in run_dir.glob("*_jour_semaine.csv"): files["day"] = f;      break
    return files

def _own_by_user(params: dict, current_user_id: str) -> bool:
    """
    Si params contient un 'user_id' (ou run_user.id), on le respecte.
    Sinon on accepte (legacy, pas de régression).
    """
    try:
        uid = str((params.get("run_user") or {}).get("id") or params.get("user_id") or "").strip()
        return (not uid) or (uid == str(current_user_id))
    except Exception:
        return True

def _compose_label(params: dict, fallback_dir: Path) -> Tuple[str, str]:
    """Construit (label, period) lisibles pour l’UI."""
    pair = str(params.get("pair") or "").strip() or "?"
    period = str(params.get("period") or "").strip() or ""
    tf = str(params.get("timeframe") or "").strip()
    strategy = str(params.get("strategy") or "").strip()
    core = f"{pair} · {period}" if period else pair
    if tf:        core = f"{core} · {tf}"
    if strategy:  core = f"{core} · {strategy}"
    if core.strip() in {"·", "", "?"}:
        core = fallback_dir.name
    return core, (period or "")

def _extract_global_metrics(df_global: pd.DataFrame) -> Tuple[Optional[int], Optional[float], Optional[float]]:
    """
    global.csv a normalement lignes 'Metric' + 'Value'.
    On récupère Total Trades, Winrate Global (TP1) en %.
    """
    try:
        df = df_global
        if not {"Metric", "Value"}.issubset(df.columns):
            return None, None, None
        def get_value(metric_name: str) -> Optional[float]:
            row = df.loc[df["Metric"] == metric_name, "Value"]
            if row.empty:
                return None
            try:
                return float(str(row.iloc[0]).replace("%", "").strip())
            except Exception:
                return None

        total_trades = get_value("Total Trades")
        winrate_global = get_value("Winrate Global")
        winrate_tp2 = get_value("TP2 Winrate")  # si non dispo ⇒ None
        trades_count = int(total_trades) if total_trades is not None else None
        winrate_tp1 = (winrate_global / 100.0) if winrate_global is not None else None
        winrate_tp2 = (winrate_tp2 / 100.0) if winrate_tp2 is not None else None
        return trades_count, winrate_tp1, winrate_tp2
    except Exception:
        return None, None, None

# ------------ API: options ------------

def list_user_compare_options(current_user_id: str) -> CompareOptionsResponse:
    items: List[CompareOptionsItem] = []
    for run_dir in _find_runs(ANALYSIS_DIR):
        params = _load_params(run_dir)
        if not _own_by_user(params, current_user_id):
            continue

        files = _detect_files(run_dir)
        if not files["global"]:
            continue

        df_global = _safe_read_csv(files["global"])
        trades_count, wr1, wr2 = (None, None, None)
        if df_global is not None:
            trades_count, wr1, wr2 = _extract_global_metrics(df_global)

        label, period = _compose_label(params, run_dir)

        item = CompareOptionsItem(
            id=run_dir.name,  # id simple = nom du dossier
            label=label,
            pair=str(params.get("pair") or ""),
            period=period,
            created_at=None,  # si dispo plus tard: run_at/created_at
            trades_count=trades_count,
            winrate_tp1=wr1,
            winrate_tp2=wr2,
        )
        items.append(item)

    return CompareOptionsResponse(items=items)

# ------------ API: séries pour graph ------------

def build_compare_series(current_user_id: str, req: CompareDataRequest) -> CompareDataResponse:
    metric = req.metric

    # Déterminer buckets & type de valeur
    if metric == "session":
        buckets = DEFAULT_SESSIONS; value_type = "percentage"; precision = 1
    elif metric == "day":
        buckets = DEFAULT_DAYS;     value_type = "percentage"; precision = 1
    elif metric == "hour":
        buckets = DEFAULT_HOURS;    value_type = "percentage"; precision = 1
    elif metric in {"winrate_tp1", "winrate_tp2", "sl_rate"}:
        buckets = ["Global"];       value_type = "percentage"; precision = 2
    elif metric == "trades_count":
        buckets = ["Global"];       value_type = "count";      precision = 0
    else:
        buckets = ["Global"];       value_type = "percentage"; precision = 2

    series: List[SeriesItem] = []

    # Map id -> dossier (perfs)
    id_to_dir: Dict[str, Path] = {d.name: d for d in _find_runs(ANALYSIS_DIR)}

    for analysis_id in req.analysis_ids:
        run_dir = id_to_dir.get(analysis_id)
        if not run_dir:
            series.append(SeriesItem(analysis_id=analysis_id, label=f"{analysis_id}", values=[None]*len(buckets)))
            continue

        params = _load_params(run_dir)
        if not _own_by_user(params, current_user_id):
            series.append(SeriesItem(analysis_id=analysis_id, label=f"{analysis_id}", values=[None]*len(buckets)))
            continue

        files = _detect_files(run_dir)
        label, _period = _compose_label(params, run_dir)

        values: List[Optional[float]] = [None]*len(buckets)

        if metric == "session" and files["sessions"]:
            df = _safe_read_csv(files["sessions"])
            if df is not None and {"session", "winrate"}.issubset(df.columns):
                wr_map = {str(r["session"]): float(r["winrate"])/100.0 for _, r in df.iterrows()}
                values = [wr_map.get(b, None) for b in buckets]

        elif metric == "day" and files["day"]:
            df = _safe_read_csv(files["day"])
            if df is not None and {"day_name", "winrate"}.issubset(df.columns):
                wr_map = {str(r["day_name"]): float(r["winrate"])/100.0 for _, r in df.iterrows()}
                values = [wr_map.get(b, None) for b in buckets]

        elif metric == "hour" and files["hour"]:
            df = _safe_read_csv(files["hour"])
            if df is not None and {"hour", "winrate"}.issubset(df.columns):
                wr_map = {f"{int(r['hour']):02d}": float(r["winrate"])/100.0 for _, r in df.iterrows()}
                values = [wr_map.get(b, None) for b in buckets]

        elif metric in {"winrate_tp1", "winrate_tp2", "sl_rate", "trades_count"} and files["global"]:
            df = _safe_read_csv(files["global"])
            if df is not None and {"Metric", "Value"}.issubset(df.columns):
                def get_val(name: str) -> Optional[float]:
                    row = df.loc[df["Metric"] == name, "Value"]
                    if row.empty:
                        return None
                    try:
                        return float(str(row.iloc[0]).replace("%", "").strip())
                    except Exception:
                        return None

                if metric == "trades_count":
                    total_trades = get_val("Total Trades")
                    values = [float(total_trades) if total_trades is not None else None]
                elif metric == "winrate_tp1":
                    wr = get_val("Winrate Global")
                    values = [wr/100.0 if wr is not None else None]
                elif metric == "winrate_tp2":
                    wr = get_val("TP2 Winrate")
                    values = [wr/100.0 if wr is not None else None]
                elif metric == "sl_rate":
                    tp1 = get_val("TP1") or 0.0
                    sl = get_val("SL") or 0.0
                    total = tp1 + sl
                    rate = (sl/total) if total > 0 else None
                    values = [rate]

        series.append(SeriesItem(analysis_id=analysis_id, label=label, values=values))

    return CompareDataResponse(
        metric=metric,
        value_type=value_type,
        precision=precision,
        buckets=buckets,
        series=series
    )
