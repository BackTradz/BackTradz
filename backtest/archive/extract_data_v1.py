import yfinance as yf
import pandas as pd
import ta
import yfinance as yf
import pandas as pd


# === Paramètres personnalisables ===
ticker = "GBPUSD=X"                   # Exemple : "EURUSD=X", "BTC-USD", "AAPL"
interval = "5m"                       # Intervalle : "1m", "5m", "15m", "1h", "1d"
start_date = "2025-03-15"             # Format : AAAA-MM-JJ
end_date = "2025-04-15"
output_filename = "GBPUSD_data_15.03-04_clean.csv"

# === Téléchargement des données ===
data = yf.download(ticker, interval=interval, start=start_date, end=end_date)

# Calculer le RSI (14 périodes)
delta = data['Close'].diff()
gain = delta.where(delta > 0, 0)
loss = -delta.where(delta < 0, 0)

avg_gain = gain.rolling(window=14).mean()
avg_loss = loss.rolling(window=14).mean()

rs = avg_gain / avg_loss
rsi = 100 - (100 / (1 + rs))

# Ajouter le RSI à la DataFrame

data['RSI_14'] = rsi


    # === Sélection des colonnes utiles ===
df_clean = data[['Open', 'High', 'Low', 'Close', 'Volume', 'RSI_14']].dropna()

    # === Sauvegarde au format CSV ===
df_clean.to_csv(output_filename)
print(f"✅ Données extraites et sauvegardées dans : {output_filename}")
