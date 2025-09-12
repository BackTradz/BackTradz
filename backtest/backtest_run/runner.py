
### ==== V5

import pandas as pd
import os
from datetime import datetime
from pathlib import Path
from utils.logger import log_params_to_file


# === CONFIGURATION PERSONNALISABLE ===
CSV_NAME = "XAUUSD_data_01.06-30.06_m5_ema.csv"
SYMBOL = "XAU"  # btc pour crypto  
TIMEFRAME = "m5"
PERIODE = "01-06,30-06-25"
AUTO_ANALYZE = False

# === SL/TP GLOBAUX
SL_PIPS = 100
TP1_PIPS = 100
TP2_PIPS = 200

### === STRATÉGIE À MODIFIER ICI ===
#####======fvg avec pullback======#######
from strategies.fvg_pullback_multi import detect_fvg_pullback_multi
from strategies.fvg_pullback_tendance_ema import detect_fvg_pullback_tendance_ema
from strategies.fvg_pullback_multi_rsi import detect_fvg_pullback_multi_rsi
from strategies.fvg_pullback_tendance_ema_rsi import detect_fvg_pullback_tendance_ema_rsi
from strategies.fvg_pullback_multi_ema import detect_fvg_pullback_multi_ema

######======OB*(ob suivi d'un gap)=======#####
from strategies.ob_pullback_gap import detect_ob_pullback_gap
from strategies.ob_pullback_gap_tendance_ema import detect_ob_pullback_gap_tendance_ema
from strategies.ob_pullback_gap_rsi import detect_ob_pullback_gap_rsi
from strategies.ob_pullback_gap_ema_simple import detect_ob_pullback_gap_ema_simple
from strategies.ob_pullback_gap_tendance_ema_rsi import detect_ob_pullback_gap_ema_rsi

######======ob normal(sans le gap)=======#####
from strategies.ob_pullback_pure import detect_ob_pullback_pure
from strategies.ob_pullback_pure_tendance_ema import detect_ob_pullback_pure_tendance_ema
from strategies.ob_pullback_pure_rsi import detect_ob_pullback_pure_rsi
from strategies.ob_pullback_pure_tendance_ema_rsi import detect_ob_pullback_pure_tendance_ema_rsi
from strategies.ob_pullback_pure_ema_simple import detect_ob_pullback_pure_ema_simple
from strategies.ob_pullback_pure_ema_simple_rsi import detect_ob_pullback_pure_ema_simple_rsi


STRATEGIES = [
    {"name": "fvg_pullback_multi", "func": detect_fvg_pullback_multi},
    {"name": "fvg_pullback_tendance_ema", "func": detect_fvg_pullback_tendance_ema},
    {"name": "fvg_pullback_multi_rsi", "func": detect_fvg_pullback_multi_rsi},
    {"name": "fvg_pullback_tendance_ema_rsi", "func": detect_fvg_pullback_tendance_ema_rsi},
    {"name": "fvg_pullback_multi_ema", "func": detect_fvg_pullback_multi_ema},

    {"name": "ob_pullback_gap", "func": detect_ob_pullback_gap},
    {"name": "ob_pullback_gap_tendance_ema", "func": detect_ob_pullback_gap_tendance_ema},
    {"name": "ob_pullback_gap_rsi", "func": detect_ob_pullback_gap_rsi},
    {"name": "ob_pullback_gap_ema_simple", "func": detect_ob_pullback_gap_ema_simple},
    {"name": "ob_pullback_gap_ema_rsi", "func": detect_ob_pullback_gap_ema_rsi},

    {"name": "ob_pullback_pure", "func": detect_ob_pullback_pure},
    {"name": "ob_pullback_pure_tendance_ema", "func": detect_ob_pullback_pure_tendance_ema},
    {"name": "ob_pullback_pure_rsi", "func": detect_ob_pullback_pure_rsi},
    {"name": "ob_pullback_pure_tendance_ema_rsi", "func": detect_ob_pullback_pure_tendance_ema_rsi},
    {"name": "ob_pullback_pure_ema_simple", "func": detect_ob_pullback_pure_ema_simple},
    {"name": "ob_pullback_pure_ema_simple_rsi", "func": detect_ob_pullback_pure_ema_simple_rsi},
]


def get_pip_value():
    if "BTC" in SYMBOL or "ETH" in SYMBOL:
        pip = 0.01
    elif "JPY" in SYMBOL:
        pip = 0.01
    elif "XAU" in SYMBOL or "GC=F" in SYMBOL:
        pip = 0.1
    else:
        pip = 0.0001

    print(f"✔️ Pip value détectée pour {SYMBOL} : {pip}")
    return pip


def run_strategy(df, name, func):
    print(f"🚀 Backtest stratégie : {name}")
    try:
        signals = func(df.copy())
    except Exception as e:
        print(f"❌ Erreur {name} : {e}")
        return

    pip = get_pip_value()
    results = []
    for sig in signals:
        entry_price = float(sig["entry"])
        entry_time = pd.to_datetime(sig["time"])
        direction = sig["direction"]
        sl = entry_price - SL_PIPS * pip if direction == "buy" else entry_price + SL_PIPS * pip
        tp1 = entry_price + TP1_PIPS * pip if direction == "buy" else entry_price - TP1_PIPS * pip
        tp2 = entry_price + TP2_PIPS * pip if direction == "buy" else entry_price - TP2_PIPS * pip
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

        for i in range(entry_index + 1, len(df)):
            high = df.iloc[i]["High"]
            low = df.iloc[i]["Low"]

            if direction == "buy":
                if not tp1_hit and high >= tp1:
                    tp1_hit = True
                if not tp1_hit and low <= sl:
                    break
                if tp1_hit and high >= tp2:
                    tp2_hit = True
                    break
                if tp1_hit and low <= sl:
                    sl_hit = True
                    break
            else:
                if not tp1_hit and low <= tp1:
                    tp1_hit = True
                if not tp1_hit and high >= sl:
                    break
                if tp1_hit and low <= tp2:
                    tp2_hit = True
                    break
                if tp1_hit and high >= sl:
                    sl_hit = True
                    break

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

    # === EXPORT CSV
    strat_folder = Path("../Analyse_result/Backtest_result") / name
    strat_folder.mkdir(parents=True, exist_ok=True)
    df_result = pd.DataFrame(results)
    result_path = strat_folder / "backtest_result.csv"
    df_result.to_csv(result_path, index=False)

    # === LOG PARAMÈTRES
    from inspect import signature 

    # on extrait les paramètres par defaut de chaque strategies
    sig = signature(func)
    params = {k: v.default for k, v in sig.parameters.items() if v.default is not v.empty}

    #on ajoute manuellement les parametre définis dans le runner(sl/tp)
    params.update({
        "sl_pips": SL_PIPS,
        "tp1_pips": TP1_PIPS,
        "tp2": TP2_PIPS
     
    })

    log_params_to_file(
        strategy=name,
        pair=SYMBOL,
        timeframe=TIMEFRAME,
        period=PERIODE,
        params=params, #on log tout les parametre 
        output_dir=str(strat_folder),
        note=f"Résultat runner V5 - {name}"
    )

    # === ANALYSE AUTO
    if AUTO_ANALYZE:
        import analyseur
        analyseur.FILENAME = str(result_path)
        analyseur.STRATEGY_NAME = f"{SYMBOL}({PERIODE}){TIMEFRAME}_{name}"
        analyseur.main()

def main():
    csv_path = Path("../Data_extract") / CSV_NAME
    df = pd.read_csv(csv_path)
    df = df[df["Open"] != "GBPUSD=X"]
    for col in ["Open", "High", "Low", "Close"]:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna().reset_index(drop=True)
    df["Datetime"] = pd.to_datetime(df["Datetime"])
    df.set_index("Datetime", inplace=True)

    if "RSI_14" in df.columns:
        df.rename(columns={"RSI_14": "RSI"}, inplace=True)

    for strat in STRATEGIES:
        name_with_sl = f"{strat['name']}_sl{SL_PIPS}"
        run_strategy(df, name_with_sl, strat["func"])


if __name__ == "__main__":
    main()
