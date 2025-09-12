import os
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

# ========== PARAMÈTRES ==========

PAIRS = ["EURUSD=X", "GBPUSD=X", "USDJPY=X"]
TIMEFRAMES = {
    "M1": "1m",
    "M5": "5m",
    "M15": "15m",
    "M30": "30m",
    "H1": "1h",
    "H4": "4h",
    "D1": "1d"
}
MONTH = "2025-05"
ONLY_TF = None  # Exemple: "M1" pour récupérer uniquement M1
ADD_EMA = False

# ========== FONCTIONS UTILES ==========

def enrich_data(df):
    df['RSI_14'] = df['Close'].rolling(window=14).apply(lambda x: 100 - (100 / (1 + (x.pct_change().mean() / abs(x.pct_change().std() or 1)))), raw=False)
    if ADD_EMA:
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        df['EMA_200'] = df['Close'].ewm(span=200, adjust=False).mean()
    return df

# ========== EXTRACTION ==========

month_start = datetime.strptime(MONTH, "%Y-%m")
month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
month_str = month_start.strftime("%Y-%m")

for pair in PAIRS:
    pair_clean = pair.replace("=X", "")
    for tf_label, interval in TIMEFRAMES.items():
        if ONLY_TF and tf_label != ONLY_TF:
            continue

        pair_folder = os.path.join("output", pair_clean, month_str)
        os.makedirs(pair_folder, exist_ok=True)

        if tf_label == "M1":
            full_data = pd.DataFrame()
            current_start = month_start

            while current_start <= month_end:
                current_end = min(current_start + timedelta(days=6), month_end)
                print("📡 {} {} : {} → {}".format(pair, tf_label, current_start.date(), current_end.date()))
                try:
                    chunk = yf.download(pair, interval=interval, start=current_start.strftime("%Y-%m-%d"), end=(current_end + timedelta(days=1)).strftime("%Y-%m-%d"))
                    if chunk.empty:
                        print("⚠️ {} {} : aucune donnée entre {} et {}".format(pair, tf_label, current_start.date(), current_end.date()))
                    else:
                        full_data = pd.concat([full_data, chunk])
                except Exception as e:
                    print("❌ {} {} : erreur chunk {} → {} : {}".format(pair, tf_label, current_start.date(), current_end.date(), e))
                current_start = current_end + timedelta(days=1)

            if full_data.empty:
                print("❌ {} {} : aucune donnée M1 sur tout le mois".format(pair, tf_label))
                continue

            data = full_data

        else:
            print("📡 {} {} : récupération en cours".format(pair, tf_label))
            try:
                data = yf.download(pair, interval=interval, start=month_start.strftime("%Y-%m-%d"), end=(month_end + timedelta(days=1)).strftime("%Y-%m-%d"))
            except Exception as e:
                print("❌ {} {} : erreur récupération : {}".format(pair, tf_label, e))
                continue

            if data.empty:
                print("❌ {} {} : aucune donnée".format(pair, tf_label))
                continue

        try:
            data = enrich_data(data)
            data.reset_index(inplace=True)
            columns = ['Datetime', 'Open', 'High', 'Low', 'Close', 'Volume', 'RSI_14']
            if ADD_EMA:
                columns += ['EMA_50', 'EMA_200']
            df_clean = data[columns].dropna()
            filename = "{}_{}_{}.csv".format(pair_clean, tf_label, month_str)
            filepath = os.path.join(pair_folder, filename)
            df_clean.to_csv(filepath, index=False)
            print("✅ {} {} : {} lignes -> {}".format(pair, tf_label, len(df_clean), filename))
        except Exception as e:
            print("⚠️ Erreur {}={}: {}".format(pair, tf_label, e))
