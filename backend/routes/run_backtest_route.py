"""
File: backend/routes/run_backtest_route.py
Role: Expose les routes de lancement de backtest:
      - /run_backtest (data officielles chargées côté backend)
      - /upload_csv_and_backtest (CSV custom uploadé)
Depends:
  - backend.core.runner_core.run_backtest
  - backend.core.analyseur_core.run_analysis
  - backend.utils.data_loader.load_data_or_extract (chargement/filtre par période)
  - backend.models.users.get_user_by_token, decrement_credits
Side-effects:
  - Lecture/écriture de fichiers (CSV résultat + XLSX analyse)
  - Décrément des crédits utilisateur (si exécution réussie)
Security:
  - Auth attendue via header X-API-Key (voir paramètres 'authorization')
Notes:
  - AUCUNE modification de logique. Ajout de docstrings + commentaires seulement.
"""
from backend.core.admin import is_admin_user
from fastapi import APIRouter
from pydantic import BaseModel
from backend.core.runner_core import run_backtest
from backend.core.analyseur_core import run_analysis
from backend.utils.data_loader import load_csv_filtered
import json
import importlib
import pandas as pd
from pathlib import Path
from backend.models.users import get_user_by_token, decrement_credits
from backend.models.users import charge_2_credits_for_backtest
from fastapi import Header
from fastapi import UploadFile, File, Form
from backend.core.admin import is_admin_user
# --- ADD: mirroring vers ANALYSIS_DIR (disque Render) ---
from backend.core.paths import ANALYSIS_DIR
import shutil
import time
import re
from datetime import datetime
from datetime import timedelta

from zoneinfo import ZoneInfo
PARIS_TZ = ZoneInfo("Europe/Paris")


router = APIRouter()

class BacktestRequest(BaseModel):
    """
    Payload d'entrée pour /run_backtest (données officielles chargées côté backend).

    Fields:
        strategy (str): nom du module stratégie (ex: "fvg_pullback_multi")
        params (dict): paramètres passés à la stratégie
        sl_pips (int): stop-loss en pips
        tp1_pips (int): take-profit 1 en pips
        tp2_pips (int): take-profit 2 en pips
        symbol (str): symbole (ex: "XAU")
        timeframe (str): TF (ex: "m5")
        start_date (str): début (ISO ou 'YYYY-MM-DD')
        end_date (str): fin   (ISO ou 'YYYY-MM-DD')
        auto_analyze (bool): si True, lance analyse derrière (ici True par défaut)
    """
    strategy: str
    params: dict
    sl_pips: int = 100
    tp1_pips: int = 100
    tp2_pips: int = 200
    symbol: str = "XAU"
    timeframe: str = "m5"
    start_date: str
    end_date: str
    auto_analyze: bool = True



# 🔁 remplace l'ancien _parse_iso_ymd par ceci :
DATE_PATTERNS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")


def _parse_date_flex(s: str) -> datetime | None:
    if not s:
        return None
    s = str(s).strip().replace("Z", "")
    # Si on reçoit "YYYY-MM-DDTHH:MM:SS", on ne garde que la date
    if "T" in s:
        s = s.split("T", 1)[0]
    # ISO direct
    try:
        return datetime.fromisoformat(s)
    except Exception:
        pass
    # Formats courants (ISO + FR)
    for fmt in DATE_PATTERNS:
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            continue
    return None


def _days_inclusive(d1: datetime, d2: datetime) -> int:
    return (d2.date() - d1.date()).days + 1

PAIR_RE = re.compile(r'([A-Z0-9]{2,6}[-_/]?[A-Z0-9]{2,6})', re.IGNORECASE)
TF_RE   = re.compile(r'\b(M5|M15|M30|H1|H4|D1)\b', re.IGNORECASE)

def _detect_symbol_from_name(name: str) -> str | None:
    if not name:
        return None
    # retirer un éventuel TF pour éviter les confusions
    core = TF_RE.sub(" ", name)
    m = PAIR_RE.search(core.replace(" ", "_"))
    if not m:
        return None
    sym = m.group(1).upper().replace("/", "-").replace("_", "-")
    if sym.endswith("=X"):  # ex: GBPUSD=X
        sym = sym[:-2]
    if "-" not in sym and len(sym) == 6:
        sym = sym[:3] + "-" + sym[3:]
    return sym

def _detect_tf_from_name(name: str) -> str | None:
    m = TF_RE.search(name or "")
    return m.group(1).upper() if m else None

def _infer_tf_from_df(df: pd.DataFrame) -> str | None:
    if "time" not in df.columns or len(df) < 3:
        return None
    s = pd.to_datetime(df["time"], utc=True, errors="coerce").dropna().sort_values()
    if len(s) < 3:
        return None
    dt = (s.iloc[1:] - s.iloc[:-1]).median()
    if not isinstance(dt, pd.Timedelta):
        return None
    minutes = int(dt / timedelta(minutes=1))
    mapping = {5: "M5", 15: "M15", 30: "M30", 60: "H1", 240: "H4", 1440: "D1"}
    return mapping.get(minutes)


@router.post("/run_backtest")
def launch_backtest(req: BacktestRequest, authorization: str = Header(None, alias="X-API-Key")):
    """
    Lance un backtest à partir des données officielles (chargées par util interne).

    Auth:
        - Header "X-API-Key" attendu dans `authorization`.

    Flow (inchangé):
      1) Vérifie token + crédits.
      2) Charge la data via load_data_or_extract(symbol, timeframe, start, end).
      3) Import dynamique du module stratégie (detect_<strategy>).
      4) Exécute run_backtest → renvoie chemin CSV résultat.
      5) Exécute run_analysis → renvoie chemin XLSX analyse.
      6) Décrémente crédits **uniquement si** analyse OK.

    Returns:
        dict: message, remaining credits, chemins csv/xlsx (ou error).
    """
    try:
        print("🚀 Requête reçue :")
        print("• Stratégie :", req.strategy)
        print("• Symbole / TF :", req.symbol, "/", req.timeframe)
        print("• Dates :", req.start_date, "→", req.end_date)
        print("• Paramètres :", req.params)
        print("• SL / TP :", req.sl_pips, "/", req.tp1_pips, "/", req.tp2_pips)
        print("• Analyse auto ?", req.auto_analyze)
        print("🧠 DEBUG HEADERS")
        print("  • Authorization param reçu :", authorization)
        t0 = time.perf_counter()


         # ✅ Vérification crédits
        if not authorization:
            return {"error": "Token manquant dans les headers"}

        user = get_user_by_token(authorization)
        if not user:
            return {"error": "Utilisateur non trouvé (token invalide)"}
        if user.credits < 2:  # ⬅️ était <=0
            return {"error": "Crédits insuffisants pour lancer un backtest"}

        # is_admin robuste (supporte user.role ou user.is_admin)
        is_admin = is_admin_user(user)


        # 🗓️ Garde-fou 31 jours (OFFICIEL) — seulement si pas admin
        if not is_admin:
            sd = _parse_date_flex(req.start_date)
            ed = _parse_date_flex(req.end_date)
            if not sd or not ed:
                return {"error": "Format de date invalide (YYYY-MM-DD attendu)."}
            days = _days_inclusive(sd, ed)
            if days > 31:
                return {"error": f"Période trop longue ({days} jours). Maximum autorisé: 31 jours."}

        # 1. Chargement CSV filtré par dates
        from backend.utils.data_loader import load_data_or_extract
        df = load_data_or_extract(req.symbol, req.timeframe, req.start_date, req.end_date)

        if df.empty:
            return {"error": "Aucune donnée trouvée pour cette période."}

        # 2. Import dynamique de la stratégie
        module_path = f"backend.strategies.{req.strategy}"
        print("📦 Chargement module :", module_path)
        strategy_module = importlib.import_module(module_path)
        strategy_func = getattr(strategy_module, f"detect_{req.strategy}")
        print("✅ Fonction chargée :", strategy_func)

        # 3. Exécution du runner
        print("🏃 Lancement du backtest...")
        period_str = f"{req.start_date} to {req.end_date}"
        csv_result_path = run_backtest(
            df=df,
            strategy_name=req.strategy,
            strategy_func=strategy_func,
            sl_pips=req.sl_pips,
            tp1_pips=req.tp1_pips,
            tp2_pips=req.tp2_pips,
            symbol=req.symbol,
            timeframe=req.timeframe,
            period=period_str,
            auto_analyze=False,
            params=req.params,
            user_id=user.id  # 🔥 On passe le user ici
        )
        print("✅ Résultat backtest :", csv_result_path)

        # 4. Lancement de l’analyse
        print("📊 Lancement de l’analyse...")
        analysis_xlsx_path = run_analysis(
            csv_result_path,
            req.strategy,
            req.symbol,
            req.sl_pips,
            period_str
        )

        if not analysis_xlsx_path or not Path(analysis_xlsx_path).exists():
            print("❌ Analyse échouée ou pas assez de données, crédit NON décompté.")
            return {"error": "Pas assez de données pour effectuer une analyse. Aucun crédit décompté."}

        print("✅ Analyse terminée :", analysis_xlsx_path)
        elapsed_ms = int((time.perf_counter() - t0) * 1000)

        src_dir = Path(analysis_xlsx_path).parent  # ex: backend/data/analysis/....../
        try:
            # On ne copie que si la source est sous 'backend/data/analysis'
            if "backend/data/analysis" in str(src_dir).replace("\\", "/"):
                dest_dir = ANALYSIS_DIR / src_dir.name
                dest_dir.parent.mkdir(parents=True, exist_ok=True)

                # copie tolérante (dirs_exist_ok dispo en Py3.8+)
                shutil.copytree(src_dir, dest_dir, dirs_exist_ok=True)

                # on repointe le chemin XLSX vers le miroir sur disque Render
                analysis_xlsx_path = str(dest_dir / Path(analysis_xlsx_path).name)
                print(f"🔁 Miroir ANALYSIS_DIR: {dest_dir}")
        except Exception as _e:
            print("⚠️ Mirror vers ANALYSIS_DIR échoué:", _e)

        # ✅ Crédit décrémenté uniquement si succès
        try:
            # Métadonnées pour historiser proprement dans admin/user
            folder = Path(analysis_xlsx_path).parent.name if analysis_xlsx_path else None
            period_str = f"{req.start_date} to {req.end_date}"
            charge_2_credits_for_backtest(user.id, {
                "symbol": req.symbol,
                "timeframe": req.timeframe,
                "strategy": req.strategy,
                "period": period_str,
                "folder": folder,
                "duration_ms": elapsed_ms,   # NEW: perf backtest
                "credits_delta": -2,          # NEW: utile pour credits_flow
                "type": "backtest",                                              # NEW
                "label": f"Backtest {req.symbol} {req.timeframe} {req.strategy}" # NEW
            })
        except ValueError as e:
            # Cas très rare: si solde a changé entre-temps → on ne bloque pas le succès,
            # on retourne l'info de solde et on log client-side si besoin.
            print("⚠️ Débit post-succès impossible:", e)

        updated_user = get_user_by_token(authorization)


        return {
            "message": "Backtest + analyse terminés",
            "credits_remaining": updated_user.credits,
            "csv_result": str(csv_result_path),
            "xlsx_result": str(analysis_xlsx_path)
        }

    except Exception as e:
        print("❌ ERREUR GLOBALE :", str(e))
        return {"error": str(e)}




@router.post("/upload_csv_and_backtest")
async def upload_csv_and_backtest(
    strategy: str = Form(...),
    sl_pips: int = Form(100),
    tp1_pips: int = Form(100),
    tp2_pips: int = Form(200),
    symbol: str = Form("CUSTOM"),
    timeframe: str = Form("CUSTOM"),
    start_date: str = Form(None),
    end_date: str = Form(None),
    csv_file: UploadFile = File(...),
    authorization: str = Header(None, alias="X-API-Key")
):
    """
    Lancement backtest avec CSV uploadé par l'utilisateur.

    Args:
      - strategy, sl_pips, tp1_pips, tp2_pips, symbol, timeframe: paramètres du backtest
      - start_date, end_date: filtres temporels optionnels (ISO/UTC)
      - csv_file: fichier CSV utilisateur (colonnes attendues)
      - authorization: header X-API-Key (token user)

    Flow (inchangé):
      1) Auth + crédits.
      2) Lecture CSV (UploadFile) → DataFrame.
      3) Vérif colonnes minimales (Datetime, OHLC).
      4) Filtre dates si présent.
      5) Nettoyage (coercition types, dropna, index Datetime).
      6) Import dynamique stratégie.
      7) run_backtest → CSV, puis run_analysis → XLSX.
      8) Décrémente crédits si analyse OK.
    """
    try:
        print("🚀 CSV utilisateur reçu :", csv_file.filename)
        print("• Stratégie :", strategy)
        print("• SL / TP :", sl_pips, "/", tp1_pips, "/", tp2_pips)
        print("🧠 DEBUG HEADERS")
        print("  • Authorization param reçu :", authorization)

        # 🔒 Auth
        if not authorization:
            return {"error": "Token manquant dans les headers"}
        user = get_user_by_token(authorization)
        if not user:
            return {"error": "Utilisateur non trouvé (token invalide)"}
        if user.credits < 2:
            return {"error": "Crédits insuffisants pour lancer un backtest"}

        # 📥 Lecture CSV depuis UploadFile
        from io import BytesIO
        csv_bytes = await csv_file.read()
        buffer = BytesIO(csv_bytes)
        df = pd.read_csv(buffer)

        # 🔧 Normalisation colonnes pour coller au runner_core
        #    -> runner_core attend: {'time','Open','High','Low','Close'}
        lower = {c.lower(): c for c in df.columns}

        # 1) 'Datetime'/'datetime'/'date' -> 'time'
        if "time" not in df.columns:
            if "datetime" in lower:
                df.rename(columns={lower["datetime"]: "time"}, inplace=True)
            elif "date" in lower:
                df.rename(columns={lower["date"]: "time"}, inplace=True)

        # 2) OHLC en casse standard
        for k in ["Open", "High", "Low", "Close"]:
            lk = k.lower()
            if k not in df.columns and lk in lower:
                df.rename(columns={lower[lk]: k}, inplace=True)

        # ✅ Vérif colonnes attendues par le runner
        expected_cols = {"time", "Open", "High", "Low", "Close"}
        if not expected_cols.issubset(df.columns):
            return {"error": f"Le fichier CSV doit contenir les colonnes : {sorted(expected_cols)}. "
                             f"Colonnes reçues : {df.columns.tolist()}"}

        # 🗓️ Parse du temps (UTC) + types numériques
        df["time"] = pd.to_datetime(df["time"], utc=True, errors="coerce")
        for col in ["Open", "High", "Low", "Close"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # 🗑️ Drop lignes invalides (ligne d'entête Yahoo, NaN, etc.)
        df = df.dropna(subset=["time", "Open", "High", "Low", "Close"]).reset_index(drop=True)

        # 🗓 Filtrage des dates si fourni (sur la colonne 'time')
        if start_date and end_date:
            start_dt = pd.to_datetime(start_date).tz_localize("UTC")
            end_dt = pd.to_datetime(end_date).tz_localize("UTC")
            df = df[(df["time"] >= start_dt) & (df["time"] <= end_dt)]

        # 📌 Index temporel comme dans le flux interne
        df = df.sort_values("time").reset_index(drop=True)  # on GARDE 'time' comme colonne
        # ✅ l’index doit être 'time' pour que le runner trouve entry_time, mais on garde aussi la colonne
        df.set_index("time", inplace=True, drop=False)
        # Evite les collisions dans les stratégies qui font reset_index() (sinon: "cannot insert time, already exists")
        df.index.name = None

         # 🔎 Détection symbole/TF si l'utilisateur a laissé "CUSTOM"
        detected_symbol = _detect_symbol_from_name(csv_file.filename or "")
        detected_tf = _detect_tf_from_name(csv_file.filename or "") or _infer_tf_from_df(df)

        sym = symbol
        tf  = timeframe
        if (not sym or sym.upper() == "CUSTOM") and detected_symbol:
            sym = detected_symbol
        if (not tf or tf.upper() == "CUSTOM") and detected_tf:
            tf = detected_tf

        print(f"🧭 Symbol/TF utilisés → {sym} / {tf} (filename='{csv_file.filename}')")

        # 🧠 Chargement dynamique de la stratégie
        module_path = f"backend.strategies.{strategy}"
        print("📦 Import :", module_path)
        strategy_module = importlib.import_module(module_path)
        strategy_func = getattr(strategy_module, f"detect_{strategy}")

        # 🏃 Lancement du runner
        t0 = time.perf_counter()
        period_str = "upload_custom"
        csv_result_path = run_backtest(
            df=df,
            strategy_name=strategy,
            strategy_func=strategy_func,
            sl_pips=sl_pips,
            tp1_pips=tp1_pips,
            tp2_pips=tp2_pips,
            symbol=sym,
            timeframe=tf,
            period=period_str,
            auto_analyze=False,
            params={},  # Pas de params dynamiques ici pour l'instant
        )

        if isinstance(csv_result_path, dict) and "error" in csv_result_path:
            return {"error": csv_result_path["error"]}

        # 📊 Lancement de l’analyse
        analysis_xlsx_path = run_analysis(
            csv_result_path,
            strategy,
            sym,
            sl_pips,
            period_str
        )

        if not analysis_xlsx_path or not Path(analysis_xlsx_path).exists():
            return {"error": "Pas assez de données pour effectuer une analyse. Aucun crédit décompté."}

        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        
        src_dir = Path(analysis_xlsx_path).parent
        try:
            if "backend/data/analysis" in str(src_dir).replace("\\", "/"):
                dest_dir = ANALYSIS_DIR / src_dir.name
                dest_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.copytree(src_dir, dest_dir, dirs_exist_ok=True)
                analysis_xlsx_path = str(dest_dir / Path(analysis_xlsx_path).name)
                print(f"🔁 Miroir ANALYSIS_DIR: {dest_dir}")
        except Exception as _e:
            print("⚠️ Mirror vers ANALYSIS_DIR échoué:", _e)
        # 🎫 Crédit -2
        try:
            folder = Path(analysis_xlsx_path).parent.name if analysis_xlsx_path else None
            period_str = f"{start_date} to {end_date}" if start_date and end_date else ""
            charge_2_credits_for_backtest(user.id, {
                "symbol": sym,
                "timeframe": tf,
                "strategy": strategy,
                "period": period_str,
                "folder": folder,
                "duration_ms": elapsed_ms,  # NEW
                "credits_delta": -2,         # NEW
                "type": "backtest",                                              # NEW
                "label": f"Backtest {sym} {tf} {strategy}" # NEW
            })
        except ValueError as e:
            print("⚠️ Débit post-succès impossible:", e)
        
        updated_user = get_user_by_token(authorization)

        return {
            "message": "Backtest CSV custom terminé",
            "credits_remaining": updated_user.credits,
            "csv_result": str(csv_result_path),
            "xlsx_result": str(analysis_xlsx_path)
        }

    except Exception as e:
        print("❌ ERREUR GLOBALE (UPLOAD) :", str(e))
        return {"error": str(e)}
