import yfinance as yf
import pandas as pd

###===== CLEAN V5
# Forex = ajouter "=X" à la fin (ex: GBPUSD = "GBPUSD=X")
# Crypto = utiliser format "BTC-USD"
# GOLD = GC=F
# Max 60 jours en 5m avec yfinance

# === Activer ou désactiver les EMA
ADD_EMA = True

def extract_data():
    # === PARAMÈTRES À MODIFIER ICI ===
    ticker = "GC=F"  # <- Corrigé
    interval = "5m"
    start_date = "2025-06-01"
    end_date = "2025-06-30"
    output_filename = "XAUUSD_data_01.06-30.06_m5_ema.csv"

    # === TÉLÉCHARGEMENT DES DONNÉES
    data = yf.download(ticker, interval=interval, start=start_date, end=end_date)
    if data.empty:
        print(f"❌ Aucune donnée trouvée pour {ticker}. Vérifie le ticker ou la période.")
        return

    # === CALCUL RSI (14)
    delta = data['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    data['RSI_14'] = rsi

    # === CALCUL EMA (si activé)
    if ADD_EMA:
        data['EMA_50'] = data['Close'].ewm(span=50).mean()
        data['EMA_200'] = data['Close'].ewm(span=200).mean()

    # === FORMAT FINAL COMPATIBLE RUNNER
    data.reset_index(inplace=True)
    columns = ['Datetime', 'Open', 'High', 'Low', 'Close', 'Volume', 'RSI_14']
    if ADD_EMA:
        columns += ['EMA_50', 'EMA_200']

    df_clean = data[columns].dropna()
    df_clean.to_csv(output_filename, index=False, encoding='utf-8')

    print(f"✅ Données extraites et sauvegardées dans : {output_filename}")
    return df_clean

if __name__ == "__main__":
    extract_data()
