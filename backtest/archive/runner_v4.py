

####===V4


import pandas as pd
import sys
sys.path.append("..")

from strategies.obm5_rsi_tendance_ema200 import detect_obm5_rsi_tendance_ema200_signals

# === PARAMÈTRES ===
csv_file_m5 = "GBPUSD_data_15.03-04_m5.csv"
csv_file_m15 = "GBPUSD_data_15.03-04_m15.csv"
sl_pips = 100
tp1_pips = 100
tp2_pips = 300

# === CHARGEMENT DES DONNÉES ===
df_m5 = pd.read_csv(csv_file_m5)
df_m15 = pd.read_csv(csv_file_m15)

df_m5['Datetime'] = pd.to_datetime(df_m5['Datetime'])
df_m15['Datetime'] = pd.to_datetime(df_m15['Datetime'])

df_m5.set_index('Datetime', inplace=True)
df_m5.rename(columns={"RSI_14": "RSI"}, inplace=True)

# === APPLICATION DE LA STRATÉGIE COMBINÉE ===
signals = detect_obm5_rsi_tendance_ema200_signals(df_m5, df_m15)
print(f"📊 Signaux détectés : {len(signals)}")

results = []
for signal in signals:
    entry_price = float(signal['entry'])
    entry_time = signal['time']
    direction = signal['direction']

    sl = entry_price - sl_pips * 0.0001 if direction == 'buy' else entry_price + sl_pips * 0.0001
    tp1 = entry_price + tp1_pips * 0.0001 if direction == 'buy' else entry_price - tp1_pips * 0.0001
    tp2 = entry_price + tp2_pips * 0.0001 if direction == 'buy' else entry_price - tp2_pips * 0.0001

    if entry_time not in df_m5.index:
        print(f"❌ Timestamp {entry_time} introuvable dans le DataFrame → ignoré.")
        continue

    entry_index = df_m5.index.get_loc(entry_time)

    # Variables de suivi
    tp1_hit = False
    tp2_hit = False
    sl_hit = False
    sl_before_tp1 = False

    for i in range(entry_index + 1, len(df_m5)):
        high = float(df_m5.iloc[i]['High'])
        low = float(df_m5.iloc[i]['Low'])

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

    # === Résultat TP1 ===
    result_tp1 = "TP1" if tp1_hit else "SL"
    results.append({
        'time': entry_time,
        'direction': direction,
        'entry': entry_price,
        'sl': sl,
        'tp': tp1,
        'result': result_tp1,
        'phase': "TP1"
    })

    # === Résultat TP2 (uniquement si TP1 atteint) ===
    if tp1_hit:
        if tp2_hit:
            result_tp2 = "TP2"
        elif sl_hit:
            result_tp2 = "SL"
        else:
            result_tp2 = "NONE"

        results.append({
            'time': entry_time,
            'direction': direction,
            'entry': entry_price,
            'sl': sl,
            'tp': tp2,
            'result': result_tp2,
            'phase': "TP2"
        })

# === EXPORT CSV ===
df_results = pd.DataFrame(results)
df_results.to_csv("backtest_results.csv", index=False)

# === RÉSUMÉ ===
tp1_total = df_results[df_results["phase"] == "TP1"]["result"].value_counts().to_dict()
tp2_total = df_results[df_results["phase"] == "TP2"]["result"].value_counts().to_dict()

print("\n--- Résumé ---")
print("TP1 :", tp1_total)
print("TP2 :", tp2_total)
print("✅ Fichier exporté : backtest_results.csv")
