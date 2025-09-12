###=== v4.1

import pandas as pd
import sys
import os
sys.path.append("..")

##log a remplir en bas de page

# === STRATÉGIE À MODIFIER ICI ===
#####======fvg avec pullback======#######
from strategies.fvg_pullback_multi import detect_fvg_pullback as detect_fvg_pullback
# from strategies.fvg_pullback_tendance_ema import detect_fvg_pullback_tendance_ema as detect_fvg_pullback
# from strategies.fvg_pullback_multi_rsi import detect_fvg_pullback_multi_rsi as detect_fvg_pullback
# from strategies.fvg_pullback_tendance_ema_rsi import detect_fvg_pullback_tendance_ema_rsi as detect_fvg_pullback
# from strategies.fvg_pullback_multi_ema import detect_fvg_pullback_multi_ema as detect_fvg_pullback
######======OB*(ob suivi d'un gap)=======#####
# from strategies.ob_pullback_gap import detect_ob_pullback_gap as detect_fvg_pullback
# from strategies.ob_pullback_gap_tendance_ema import detect_ob_pullback_gap_tendance_ema as detect_fvg_pullback
# from strategies.ob_pullback_gap_rsi import detect_ob_pullback_gap_rsi as detect_fvg_pullback
# from strategies.ob_pullback_gap_ema_simple import detect_ob_pullback_gap_ema_simple as detect_fvg_pullback
#, from strategies.ob_pullback_gap_tendance_ema_rsi import detect_ob_pullback_gap_ema_rsi as detect_fvg_pullback
######======ob normal(sans le gap)=======#####
# from strategies.ob_pullback_pure import detect_ob_pullback_pure as detect_fvg_pullback
# from strategies.ob_pullback_pure_tendance_ema import detect_ob_pullback_pure_tendance_ema as detect_fvg_pullback
# from strategies.ob_pullback_pure_rsi import detect_ob_pullback_pure_rsi as detect_fvg_pullback
# from strategies.ob_pullback_pure_tendance_ema_rsi import detect_ob_pullback_pure_tendance_ema_rsi as detect_fvg_pullback
# from strategies.ob_pullback_pure_ema_simple import detect_ob_pullback_pure_ema_simple as detect_fvg_pullback
# from strategies.ob_pullback_pure_ema_simple_rsi import detect_ob_pullback_pure_ema_simple_rsi as detect_fvg_pullback


# === PARAMÈTRES ===
csv_file_m5 = "BTCUSD_data_15.04-05_m5_ema.csv"
csv_file_m15 = "GBPUSD_data_15.03-04_m15.csv"
sl_pips = 70
tp1_pips = 70
tp2_pips = 140

# === CHARGEMENT M5
df_m5 = pd.read_csv(csv_file_m5)

# Supprimer la ligne parasite Yahoo (avec "GBPUSD=X" dans toutes les colonnes)
df_m5 = df_m5[df_m5["Open"] != "GBPUSD=X"]

# Nettoyage des invalides pour eviter les erreur de conversion sur paire cryptos
for col in ["Open", "High", "Low", "Close"]:
    df_m5[col] = pd.to_numeric(df_m5[col], errors='coerce')
invalid_rows= df_m5[df_m5[["Open", "High", "Low", "Close"]].isnull().any(axis=1)]
if not invalid_rows.empty:
    print(f"[CLEAN DATA] {len(invalid_rows)} lignes supprimés pour valeus invalides.")
    df_m5 = df_m5.dropna(subset=["Open", "High", "Low", "Close"]).reset_index(drop=True)

# Convertir les colonnes OHLC en float
df_m5[["Open", "High", "Low", "Close"]] = df_m5[["Open", "High", "Low", "Close"]].astype(float)

# Formater la date
df_m5["Datetime"] = pd.to_datetime(df_m5["Datetime"])
df_m5.set_index("Datetime", inplace=True)

# Harmonisation RSI si besoin
if "RSI_14" in df_m5.columns:
    df_m5.rename(columns={"RSI_14": "RSI"}, inplace=True)


# === STRATÉGIE ADAPTATIVE M15
try:
    if os.path.exists(csv_file_m15):
        df_m15 = pd.read_csv(csv_file_m15)
        df_m15["Datetime"] = pd.to_datetime(df_m15["Datetime"])
        signals = detect_fvg_pullback(df_m5, df_m15)
    else:
        signals = detect_fvg_pullback(df_m5)
except TypeError:
    signals = detect_fvg_pullback(df_m5)

print(f"📊 Signaux détectés : {len(signals)}")

# === SUIVI DES TRADES
results = []
for signal in signals:
    entry_price = float(signal['entry'])
    entry_time = signal['time']
    direction = signal['direction']

    def get_pip_value(symbol):

        if "BTC" in symbol or "ETH" in symbol:
            return 1.0  # Crypto
        else:
            return 0.0001  # Forex
    pip_value = get_pip_value(csv_file_m5)  # ⚠️ Assure-toi que csv_file_m5 contient bien le nom du symbole (ex : 'BTCUSD')
    

    sl = entry_price - sl_pips * pip_value if direction == 'buy' else entry_price + sl_pips * pip_value
    tp1 = entry_price + tp1_pips * pip_value if direction == 'buy' else entry_price - tp1_pips * pip_value
    tp2 = entry_price + tp2_pips * pip_value if direction == 'buy' else entry_price - tp2_pips * pip_value
 # === CALCUL DES MÉTRIQUES DE TRADE
    sl_size = abs(entry_price - sl)
    tp1_size = abs(tp1 - entry_price)
    tp2_size = abs(tp2 - entry_price)

    rr_tp1 = round(tp1_size / sl_size, 2) if sl_size != 0 else None
    rr_tp2 = round(tp2_size / sl_size, 2) if sl_size != 0 else None


    if entry_time not in df_m5.index:
        print(f"❌ Timestamp {entry_time} introuvable → ignoré.")
        continue

    entry_index = df_m5.index.get_loc(entry_time)

    tp1_hit = False
    tp2_hit = False
    sl_hit = False
    sl_before_tp1 = False

    for i in range(entry_index + 1, len(df_m5)):
        high = float(df_m5.iloc[i]["High"])
        low = float(df_m5.iloc[i]["Low"])

        if direction == 'buy':
            if not tp1_hit and high >= tp1:
                tp1_hit = True
            if not tp1_hit and low <= sl:
                sl_before_tp1 = True
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
                sl_before_tp1 = True
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

# === EXPORT
df_results = pd.DataFrame(results)
df_results.to_csv("backtest_results.csv", index=False)

# === RÉSUMÉ
tp1_total = df_results[df_results["phase"] == "TP1"]["result"].value_counts().to_dict()
tp2_total = df_results[df_results["phase"] == "TP2"]["result"].value_counts().to_dict()

print("\n--- Résumé ---")
print("TP1 :", tp1_total)
print("TP2 :", tp2_total)
print("✅ Fichier exporté : backtest_results.csv")

from utils.logger import log_params_to_file

log_params_to_file(
    strategy="fvg_pullback_multi",
    pair="BTCUSD",
    timeframe="M5",
    period="15 avril – 15 mai 2025",
    params={
        "min_pips" :  5,
        "min_wait_candles": 2,
        "max_wait_candles": 20,
        "max_touch": 4,
        "sl": 70,
        "tp1": 70,
        "tp2": 140
    },
    note="backtest fvg normal sur BTC Setup détectés OK."
)
