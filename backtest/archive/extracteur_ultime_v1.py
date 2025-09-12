
## === V1


import os
import pandas as pd
import yfinance as yf
from datetime import datetime
from dateutil.relativedelta import relativedelta

# === CONFIGURATION ===
MONTH = "2025-05"
PAIRS = ["EURUSD=X", "GBPUSD=X", "USDJPY=X"]
TIMEFRAMES = {
    "1m": "M1",
    "5m": "M5",
    "15m": "M15",
    "30m": "M30",
    "60m": "H1",
    "240m": "H4",
    "1d": "D1"
}
ADD_EMA = True

# === CALCUL DES DATES DE DÉBUT ET FIN AUTOMATIQUES
start_date = datetime.strptime(f"{MONTH}-01", "%Y-%m-%d")
end_date = (start_date + relativedelta(months=1)) - pd.Timedelta(days=1)
start_str = start_date.strftime("%Y-%m-%d")
end_str = end_date.strftime("%Y-%m-%d")
month_str = start_date.strftime("%Y-%m")

# === FONCTION DE CALCUL DES INDICATEURS
def enrich_data(data):
    delta = data['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    rs = avg_gain / avg_loss
    data['RSI_14'] = 100 - (100 / (1 + rs))
    if ADD_EMA:
        data['EMA_50'] = data['Close'].ewm(span=50).mean()
        data['EMA_200'] = data['Close'].ewm(span=200).mean()
    return data

# === EXTRACTION PRINCIPALE
output_base = "./output"
os.makedirs(output_base, exist_ok=True)

for pair in PAIRS:
    pair_clean = pair.replace("=X", "").replace("-", "")
    pair_folder = os.path.join(output_base, pair_clean, month_str)
    os.makedirs(pair_folder, exist_ok=True)

    for interval, tf_label in TIMEFRAMES.items():
        try:
            data = yf.download(pair, interval=interval, start=start_str, end=end_str)
            if data.empty:
                print(f"❌ {pair} {tf_label} : aucune donnée")
                continue

            data = enrich_data(data)
            data.reset_index(inplace=True)
            columns = ['Datetime', 'Open', 'High', 'Low', 'Close', 'Volume', 'RSI_14']
            if ADD_EMA:
                columns += ['EMA_50', 'EMA_200']

            df_clean = data[columns].dropna()
            filename = f"{pair_clean}_{tf_label}_{month_str}.csv"
            filepath = os.path.join(pair_folder, filename)
            df_clean.to_csv(filepath, index=False)
            print(f"✅ {pair} {tf_label} : {len(df_clean)} lignes -> {filename}")

        except Exception as e:
            print(f"⚠️ Erreur {pair} {tf_label} : {str(e)}")
