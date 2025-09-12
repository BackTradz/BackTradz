###=====v2

import pandas as pd
import sys  
sys.path.append("..")  # <- ça veut dire "remonte d’un dossier"

from strategies.obm5_rsi import detect_obm5_rsi_signals

# === PARAMÈTRES À MODIFIER ===
csv_file = "GBPUSD_data_15.03-04_clean.csv"
sl_pips = 70
tp1_pips = 70
tp2_pips = 140

# === CHARGEMENT DES DONNÉES ===
csv_file = "GBPUSD_data_15.03-04_clean.csv"
df = pd.read_csv(csv_file)
df['Datetime'] = pd.to_datetime(df['Datetime'])
df.set_index('Datetime', inplace=True)
df.rename(columns={"RSI_14": "RSI"}, inplace=True)




# === APPLICATION DE LA STRATÉGIE ===
signals = detect_obm5_rsi_signals(df)
print(f"📊 Nombre de signaux détectés : {len(signals)}")
for sig in signals:
    print(f"🟨 Signal détecté → time: {sig['time']}, direction: {sig['direction']}, entry: {sig['entry']}")


# === BACKTEST SIMPLIFIÉ ===
results = []
for signal in signals:
    entry_price = float(signal['entry'])
    entry_time = signal['time']
    direction = signal['direction']

    sl = entry_price - sl_pips * 0.0001 if direction == 'buy' else entry_price + sl_pips * 0.0001
    tp1 = entry_price + tp1_pips * 0.0001 if direction == 'buy' else entry_price - tp1_pips * 0.0001
    tp2 = entry_price + tp2_pips * 0.0001 if direction == 'buy' else entry_price - tp2_pips * 0.0001

    tp_hit = False
    sl_hit = False

    # ✅ CHECK SI entry_time EXISTE
    if entry_time not in df.index:
        print(f"❌ Timestamp {entry_time} introuvable dans le DataFrame → trade ignoré.")
        continue

    entry_index = df.index.get_loc(entry_time)
    for i in range(entry_index + 1, len(df)):
        high = float(df.iloc[i]['High'])
        low = float(df.iloc[i]['Low'])

        if direction == 'buy':
            if low <= sl:
                sl_hit = True
                break
            elif high >= tp1:
                tp_hit = True
                break
        else:
            if high >= sl:
                sl_hit = True
                break
            elif low <= tp1:
                tp_hit = True
                break

    print(f"📈 Trade → {entry_time} | {direction} | entry: {entry_price} | SL: {sl:.5f} | TP1: {tp1:.5f} | Résultat: {'TP1' if tp_hit else 'SL' if sl_hit else 'NONE'}")

    results.append({
        'time': entry_time,
        'direction': direction,
        'entry': entry_price,
        'sl': sl,
        'tp1': tp1,
        'tp2': tp2,
        'result': 'TP1' if tp_hit else 'SL' if sl_hit else 'NONE'
    })

# === EXPORT DES RÉSULTATS ===
df_results = pd.DataFrame(results)
df_results.to_csv("backtest_results.csv", index=False)

# === RÉSUMÉ ===
tp_count = df_results['result'].value_counts().get('TP1', 0)
sl_count = df_results['result'].value_counts().get('SL', 0)
total = len(df_results)
winrate = round(tp_count / total * 100, 2) if total > 0 else 0

print(f"\n--- Résumé ---")
print(f"Total trades : {total}")
print(f"TP1 : {tp_count}")
print(f"SL  : {sl_count}")
print(f"Winrate : {winrate}%")
print("Backtest terminé. Résultats dans backtest_results.csv")
