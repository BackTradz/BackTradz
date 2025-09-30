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
import openpyxl  # fallback XLSX comme le dashboard

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
    Tolérant: détecte via plusieurs artefacts possibles (prod/dev),
    pour coller au dashboard.
    """
    if not root.exists():
        return []
    candidates: List[Path] = []
    # params (nom exact ou variantes)
    for pat in ("params.json", "params*.json"):
        candidates += [p.parent for p in root.rglob(pat)]
    # xlsx résultats (si pas de params)
    for pat in ("*resultats.xlsx", "analyse_*_resultats.xlsx"):
        candidates += [p.parent for p in root.rglob(pat)]
    # csv globaux (fallback ultime)
    for pat in ("*_global.csv", "global.csv", "Global.csv"):
        candidates += [p.parent for p in root.rglob(pat)]
    runs = sorted(set(candidates), key=lambda d: d.stat().st_mtime, reverse=True)
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
    Aligné dashboard : si user_id présent, on compare de façon permissive.
    - accepte run_user.id ou user_id
    - cast en str, trim, insensible casse
    - si pas d'info user -> on accepte (legacy)
    """
    try:
        raw = (
            (params.get("run_user") or {}).get("id")
            or params.get("user_id")
            or ""
        )
        uid = str(raw).strip().lower()
        cur = str(current_user_id).strip().lower()
        return (uid == "") or (uid == cur)
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
        trades_count, wr1, wr2 = (None, None, None)
        # 1) CSV global si présent
        if files["global"]:
            df_global = _safe_read_csv(files["global"])
            if df_global is not None:
                trades_count, wr1, wr2 = _extract_global_metrics(df_global)
        # 2) Fallback XLSX (onglet "Global") si pas de CSV
        if trades_count is None and wr1 is None and wr2 is None:
            try:
                # tentative: 1er fichier 'analyse_*_resultats.xlsx' dans le dossier
                candidates = list(run_dir.glob("analyse_*_resultats.xlsx"))
                if candidates:
                    wb = openpyxl.load_workbook(candidates[0], data_only=True)
                    if "Global" in wb.sheetnames:
                        ws = wb["Global"]
                        metrics = {}
                        for row in ws.iter_rows(min_row=1, max_row=ws.max_row):
                            k = (str(row[0].value) if row[0].value is not None else "").strip()
                            v = row[1].value if len(row) > 1 else None
                            if k:
                                metrics[k] = v
                        def _get(*keys):
                            low = {kk.lower().replace(" ", ""): kk for kk in metrics}
                            for k in keys:
                                if k in metrics and metrics[k] is not None:
                                    return metrics[k]
                                t = k.lower().replace(" ", "")
                                if t in low and metrics.get(low[t]) is not None:
                                    return metrics[low[t]]
                            return None
                        def _as_float(x):
                            if x is None: return None
                            s = str(x).strip().replace(",", ".").replace("%", "")
                            try: return float(s)
                            except: return None
                        # Total trades (entier), winrate global (0..1), TP2 si dispo
                        tr = _as_float(_get("Total Trades","Total Trad"))
                        wrg = _as_float(_get("Winrate Global","Winrate Gl","WinrateGL","WinrateGlobal","Winrate TP1"))
                        wr2 = _as_float(_get("TP2 Winrate","Winrate TP2"))
                        trades_count = int(tr) if tr is not None else None
                        wr1 = (wrg/100.0) if wrg is not None else None
                        wr2 = (wr2/100.0) if wr2 is not None else None
                    wb.close()
            except Exception:
                pass
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

        elif metric in {"winrate_tp1", "winrate_tp2", "sl_rate", "trades_count"}:
            got = False
            # 1) CSV global si présent
            if files["global"]:
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
                        values = [float(total_trades) if total_trades is not None else None]; got = True
                    elif metric == "winrate_tp1":
                        wr = get_val("Winrate Global")
                        values = [wr/100.0 if wr is not None else None]; got = True
                    elif metric == "winrate_tp2":
                        wr = get_val("TP2 Winrate")
                        values = [wr/100.0 if wr is not None else None]; got = True
                    elif metric == "sl_rate":
                        tp1 = (get_val("TP1") or 0.0)
                        sl  = (get_val("SL")  or 0.0)
                        total = tp1 + sl
                        rate = (sl/total) if total > 0 else None
                        values = [rate]; got = True
            # 2) Fallback XLSX (onglet "Global") si pas de CSV ou valeurs manquantes
            if not got:
                try:
                    candidates = list(run_dir.glob("analyse_*_resultats.xlsx"))
                    if candidates:
                        wb = openpyxl.load_workbook(candidates[0], data_only=True)
                        if "Global" in wb.sheetnames:
                            ws = wb["Global"]
                            metrics = {}
                            for row in ws.iter_rows(min_row=1, max_row=ws.max_row):
                                k = (str(row[0].value) if row[0].value is not None else "").strip()
                                v = row[1].value if len(row) > 1 else None
                                if k:
                                    metrics[k] = v
                            def _get(*keys):
                                low = {kk.lower().replace(" ", ""): kk for kk in metrics}
                                for k in keys:
                                    if k in metrics and metrics[k] is not None:
                                        return metrics[k]
                                    t = k.lower().replace(" ", "")
                                    if t in low and metrics.get(low[t]) is not None:
                                        return metrics[low[t]]
                                return None
                            def _f(x):
                                if x is None: return None
                                s = str(x).strip().replace(",", ".").replace("%", "")
                                try: return float(s)
                                except: return None
                            if metric == "trades_count":
                                tr = _f(_get("Total Trades","Total Trad"))
                                values = [float(tr) if tr is not None else None]
                            elif metric == "winrate_tp1":
                                wr = _f(_get("Winrate Global","Winrate Gl","WinrateGL","WinrateGlobal","Winrate TP1"))
                                values = [wr/100.0 if wr is not None else None]
                            elif metric == "winrate_tp2":
                                wr = _f(_get("TP2 Winrate","Winrate TP2"))
                                values = [wr/100.0 if wr is not None else None]
                            elif metric == "sl_rate":
                                tp1 = _f(_get("TP1")) or 0.0
                                sl  = _f(_get("SL")) or 0.0
                                total = tp1 + sl
                                rate = (sl/total) if total > 0 else None
                                values = [rate]
                        wb.close()
                except Exception:
                    pass

        series.append(SeriesItem(analysis_id=analysis_id, label=label, values=values))

    return CompareDataResponse(
        metric=metric,
        value_type=value_type,
        precision=precision,
        buckets=buckets,
        series=series
    )
