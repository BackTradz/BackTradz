from pathlib import Path
import pandas as pd
import json
import hashlib  # (au cas où pour util interne)
from inspect import signature
from app.utils.logger import log_params_to_file
from app.utils.pip_registry import get_pip
from app.utils.run_id import make_run_id

def run_backtest(df, strategy_name, strategy_func, sl_pips=100, tp1_pips=100, tp2_pips=200,
                    symbol="XAU", timeframe="m5", period="01-06,30-06-25", auto_analyze=False,
                    params=None, user_id=None):
    """
    Exécute un backtest sur un DataFrame de données OHLC avec une stratégie donnée.
    """
    df = df.copy()

    # 🔒 Vérifie que les colonnes minimales existent
    required_cols = {"Open", "High", "Low", "Close", "time"}
    if not required_cols.issubset(df.columns):
        print("❌ DF incomplet ou mal formaté :", df.columns.tolist())
        return {"error": f"❌ Données corrompues. Colonnes requises : {required_cols}"}

    if df.empty:
        return {"error": "Le DataFrame est vide"}

    # Nettoyage du DF
    if "RSI_14" in df.columns:
        df.rename(columns={"RSI_14": "RSI"}, inplace=True)
    df = df[df["Open"] != "GBPUSD=X"]
    for col in ["Open", "High", "Low", "Close"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna()

    print("📊 DF ready V5-like:", df.shape)

    # 1) --- PIP (source unique) AVANT l'appel stratégie ---
    s = (symbol or "").upper()
    pip = get_pip(s)
    if pip is None:
        if s.endswith("JPY"):
            pip = 0.01
        elif s == "XAUUSD" or "GC=F" in s or "GOLD" in s:
            pip = 0.1
        elif s.startswith("^"):
            pip = 1.0
        elif s.endswith("-USD") and s.split("-")[0] == "BTC":
            pip = 1.0
        else:
            pip = 0.0001
    print(f"📐 Pip factor pour {symbol} = {pip}")

    # 2) --- Construire les paramètres effectifs pour la stratégie ---
    eff_params = {}
    if isinstance(params, dict):
        eff_params.update(params)  # brut UI

    # Compat vieux front : si "tp2" est fourni, le garder pour le log côté runner (pas pour la strat)
    _tp2_from_params = None
    if "tp2" in eff_params and "tp2_pips" not in eff_params:
        try:
            _tp2_from_params = float(eff_params.get("tp2"))
        except Exception:
            _tp2_from_params = None

    # --- Normalisation UI -> types python ---
    def _to_scalar(v):
        if isinstance(v, str):
            lv = v.strip().lower()
            if lv in ("true", "false", "1", "0", "yes", "no"):
                return lv in ("true", "1", "yes")
            try:
                if any(c in lv for c in (".", "e")):
                    return float(lv)
                return int(lv)
            except Exception:
                return v
        return v
    eff_params = {k: _to_scalar(v) for k, v in eff_params.items()}

    # Signature de la stratégie (liste des paramètres acceptés)
    try:
        func_sig = signature(strategy_func)
        expected = set(func_sig.parameters.keys())
    except Exception:
        func_sig, expected = None, set()

    # [ADD] Détection des types attendus (annotation ou type du default)
    expected_types = {}
    if func_sig is not None:
        for name, p in func_sig.parameters.items():
            if name in ("df", "data", "dataframe"):
                continue
            if p.annotation is not p.empty and isinstance(p.annotation, type):
                expected_types[name] = p.annotation
            elif p.default is not p.empty and p.default is not None:
                expected_types[name] = type(p.default)

    # [ADD] Remap robuste: UI → noms internes attendus par la stratégie
    RAW = dict(eff_params)  # on garde l'original pour chercher des alias
    ALIASES = {
        # clés vraiment problématiques vues côté UI
        "min_wait_candles": ["min_wait", "min_wait_bar", "min_wait_bars", "min_wait_candle"],
        "max_wait_candles": ["max_wait", "max_wait_bar", "max_wait_bars", "max_wait_candle"],
        "allow_multiple_entries": ["allow_multi", "allow_multiple", "allow_multiple_entry", "multi_entries"],

        # EMA / RSI
        "ema_key": ["ema", "EMA", "ema_col", "ema_fast"],
        "ema_fast": ["ema1", "fast_ema", "ema_fast"],
        "ema_slow": ["ema2", "slow_ema", "ema_slow"],
        "rsi_key": ["rsi_key", "rsi_col", "RSI_col", "RSI"],
        "rsi_threshold": ["rsi_threshold", "rsiValue", "rsi_value", "rsi", "RSI"],

        # FVG / gaps
        "min_pips": ["min_gap_pips", "gap_pips", "min_fvg_pips", "fvg_min_pips"],

        # time key / datetime
        "time_key": ["time_key", "Datetime", "datetime", "date_col", "timestamp_col"],
    }

    if expected:
        for target, alts in ALIASES.items():
            if target in expected and target not in eff_params:
                for a in alts:
                    if a in RAW:
                        eff_params[target] = _to_scalar(RAW[a])
                        break

    # --- Conversion auto des *_pips -> prix (détection) ---
    for k, v in list(eff_params.items()):
        if k.endswith("_pips") and v is not None:
            try:
                eff_params[k] = float(v) * float(pip)
            except Exception:
                # valeur illisible -> on supprime pour ne pas casser l'appel
                del eff_params[k]

    # --- Forçage time_key="time" si la strat l'accepte ---
    if expected and "time_key" in expected and "time" in df.columns:
        eff_params["time_key"] = "time"

    # Valeur par défaut raisonnable si la stratégie attend 'min_pips' mais qu'on n'a rien reçu
    if expected and "min_pips" in expected and "min_pips" not in eff_params:
        eff_params["min_pips"] = 5 * float(pip)

    # [ADD] Coercition finale des types selon expected_types
    def _coerce(v, typ):
        try:
            if typ is bool:
                if isinstance(v, str):
                    return v.strip().lower() in ("true", "1", "yes")
                return bool(v)
            if typ is int:
                return int(float(v))
            if typ is float:
                return float(v)
            if typ is str:
                return str(v)
            return v
        except Exception:
            return v

    if expected:
        for k in list(eff_params.keys()):
            if k in expected_types:
                eff_params[k] = _coerce(eff_params[k], expected_types[k])

        # Ne garder que les clés que la stratégie accepte
        eff_params = {k: v for k, v in eff_params.items() if k in expected}

    # 3) --- Appel stratégie avec les bons paramètres ---
    try:
        signals = strategy_func(df.copy(), **eff_params)
    except Exception as e:
        return {"error": f"Erreur stratégie {strategy_name} : {e}"}

    # ✅ Toujours init, même si pip vient direct du registre
    results = []

    # 🧾 Boucle sur chaque signal détecté
    for sig in signals:
        try:
            sig["entry"] = float(sig["entry"])
            sig["time"] = pd.to_datetime(sig["time"])
            sig["direction"] = str(sig["direction"]).lower()
        except Exception as e:
            print(f"❌ Signal mal formaté, ignoré : {e}")
            continue

        entry_price = float(sig["entry"])
        entry_time = pd.to_datetime(sig["time"])
        direction = sig["direction"]

        # Calcul des niveaux SL / TP
        sl = entry_price - sl_pips * pip if direction == "buy" else entry_price + sl_pips * pip
        tp1 = entry_price + tp1_pips * pip if direction == "buy" else entry_price - tp1_pips * pip
        tp2 = entry_price + tp2_pips * pip if direction == "buy" else entry_price - tp2_pips * pip

        sl_size = abs(entry_price - sl)
        tp1_size = abs(tp1 - entry_price)
        tp2_size = abs(tp2 - entry_price)
        rr_tp1 = round(tp1_size / sl_size, 2)
        rr_tp2 = round(tp2_size / sl_size, 2)

        if entry_time not in df.index:
            continue

        entry_index = df.index.get_loc(entry_time)
        tp1_hit = False
        tp2_hit = False
        sl_hit = False

        # 📈 Boucle après l’entrée → vérifie si TP1/TP2 ou SL atteint
        for i in range(entry_index + 1, len(df)):
            high = df.iloc[i]["High"]
            low = df.iloc[i]["Low"]

            if direction == "buy":
                if not tp1_hit and high >= tp1: tp1_hit = True
                if not tp1_hit and low <= sl: break
                if tp1_hit and high >= tp2: tp2_hit = True; break
                if tp1_hit and low <= sl: sl_hit = True; break
            else:
                if not tp1_hit and low <= tp1: tp1_hit = True
                if not tp1_hit and high >= sl: break
                if tp1_hit and low <= tp2: tp2_hit = True; break
                if tp1_hit and high >= sl: sl_hit = True; break

        # Résultat TP1
        result_tp1 = "TP1" if tp1_hit else "SL"
        results.append({
            "time": entry_time,
            "direction": direction,
            "entry": entry_price,
            "sl": sl,
            "tp": tp1,
            "result": result_tp1,
            "phase": "TP1",
            "sl_size": sl_size,
            "tp1_size": tp1_size,
            "rr_tp1": rr_tp1
        })

        # Résultat TP2 seulement si TP1 atteint
        if tp1_hit:
            result_tp2 = "TP2" if tp2_hit else "SL" if sl_hit else "NONE"
            results.append({
                "time": entry_time,
                "direction": direction,
                "entry": entry_price,
                "sl": sl,
                "tp": tp2,
                "result": result_tp2,
                "phase": "TP2",
                "rr_tp2": rr_tp2
            })

    print("✅ Signaux détectés :", len(signals))
    print("✅ Résultats générés :", len(results))

    # 📂 Création du dossier unique pour les résultats
    #    On génère un run_id stable pour CE run (inclut ts/nonce côté util).
    #    => format du dossier conservé + suffixe "__h<run_id>" pour 0 collision.
    period_clean = period.replace(" ", "").replace(":", "")
    base_name = f"{symbol}_{timeframe}_{strategy_name}_{period_clean}_sl{sl_pips}"
    # 🔎 Normalisation "params UI bruts" pour le hash (indépendant de la strat)
    def _norm_for_hash(d):
        if not isinstance(d, dict) or not d:
            return {}
        out = {}
        for k, v in d.items():
            try:
                # mêmes règles que plus haut : booleans/nums/str simples
                if isinstance(v, str):
                    lv = v.strip().lower()
                    if lv in ("true", "false", "1", "0", "yes", "no"):
                        out[k] = lv in ("true", "1", "yes")
                    else:
                        try:
                            if any(c in lv for c in (".", "e")):
                                out[k] = float(lv)
                            else:
                                out[k] = int(lv)
                        except Exception:
                            out[k] = v
                elif isinstance(v, (bool, int, float)) or v is None:
                    out[k] = v
                else:
                    out[k] = repr(v)  # fallback stable
            except Exception:
                out[k] = repr(v)
        return out

    params_ui_norm = _norm_for_hash(params if isinstance(params, dict) else {})

    # ⚙️ Appel util avec les bons noms de paramètres (signature attendue) :
    #    On fusionne UI+eff dans un seul dict "params" pour que TOUT changement UI fasse varier le hash
    try:
        run_id = make_run_id(
            strategy_name=str(strategy_name),
            symbol=str(symbol),
            timeframe=str(timeframe),
            period=str(period),
            sl_pips=int(sl_pips),
            tp1_pips=int(tp1_pips),
            tp2_pips=(None if tp2_pips is None else int(tp2_pips)),
            params={"ui": params_ui_norm, "eff": eff_params},
            user_id=(user_id or "")
        )
    except Exception:
        # 🔒 fallback ultra simple (rare)
        _payload = {
            "strategy_name": strategy_name, "symbol": symbol, "timeframe": timeframe,
            "period": period, "sl_pips": sl_pips, "tp1_pips": tp1_pips,
            "tp2_pips": tp2_pips, "params": {"ui": params_ui_norm, "eff": eff_params},
            "user_id": user_id or ""
        }
        payload = json.dumps(_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        run_id = hashlib.sha1(payload).hexdigest()[:10]

        
    from app.core.paths import ANALYSIS_DIR
    full_name = f"{base_name}__h{run_id}"
    # ✅ Utilisation du dossier centralisé
    output_path = ANALYSIS_DIR / full_name
    output_path.mkdir(parents=True, exist_ok=True)

    # 💾 Sauvegarde CSV résultat
    csv_path = output_path / "backtest_result.csv"
    pd.DataFrame(results).to_csv(csv_path, index=False)
    print("📁 Résultats enregistrés dans :", csv_path)

    # 📝 Logging des paramètres réellement utilisés (defaults écrasés par eff_params)
    if func_sig is None:
        func_sig = signature(strategy_func)
    logged = {}
    for name, p in func_sig.parameters.items():
        if name in ("df", "data"):
            continue
        if name in eff_params:
            logged[name] = eff_params[name]
        elif p.default is not p.empty:
            logged[name] = p.default

    # 3) normaliser les types pour l'export XLSX
    def _clean(v):
        try:
            import numpy as np  # noqa
            if hasattr(v, "item"):
                return v.item()
        except Exception:
            pass
        if isinstance(v, (bool, int, float, str)) or v is None:
            return v
        return str(v)
    logged = {k: _clean(v) for k, v in logged.items()}

    # 4) ajouter les infos runner utiles
    logged.update({
        "sl_pips": sl_pips,
        "tp1_pips": tp1_pips,
        "tp2_pips": (tp2_pips if tp2_pips is not None else _tp2_from_params),
        "pip_used": pip,
    })

    log_params_to_file(
        strategy=strategy_name,
        pair=symbol,
        timeframe=timeframe,
        period=period,
        params=logged,
        output_dir=str(output_path),
        note=f"Résultat runner V5 SaaS - {strategy_name}"
    )

    #🔥 Post-log : injecter 'user_id' + 'run_id' dans le JSON écrit par log_params_to_file
    #    (on ne change PAS le logger: juste enrichir le JSON après coup)
    for file in output_path.glob("*.json"):
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "params" not in data:
                continue
            if user_id is not None:
                data["user_id"] = user_id
            data["run_id"] = run_id
            with open(file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"✅ run_id/user_id injectés dans {file.name} → {run_id} / {user_id}")
            break
        except Exception as e:
            print(f"❌ Erreur injection run_id/user_id dans {file.name} → {e}")

    return str(csv_path)
