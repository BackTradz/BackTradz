
import yfinance as yf
import pandas as pd

###===== v4
### api yahoo Finance "=x" est le suffixe du forex chez eux reserver au paires FOREX
### exemple: EUR = X veut dire EURUSD GBP = X veut dire GBPUSD 
### pour GBP/EUR je chercherai GBPEUR = X
### pour les crypto pas besoin du = X exemple:pour btc "BTC-USD"
### max 60 jour pour du 5m 

# === Activer ou désactiver le calcul des EMA ===
ADD_EMA = True  # ← Mets sur False si tu veux ignorer les EMA

def extract_data():
    # === Paramètres personnalisables ===
    ticker = "GBP =X"    
    interval = "5m"
    start_date = "2025-04-15"
    end_date = "2025-05-15"
    output_filename = "GBPUSD_data_15.04-05_m5_ema.csv"

    # === Chargement des données ===
    data = yf.download(ticker, interval=interval, start=start_date, end=end_date)

    # === Calculer le RSI (14 périodes) ===
    delta = data['Close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)

    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    data['RSI_14'] = rsi

    # === Ajout conditionnel des EMA ===
    if ADD_EMA:
        data['EMA_50'] = data['Close'].ewm(span=50).mean()
        data['EMA_200'] = data['Close'].ewm(span=200).mean()

    # === Reset index pour que datetime soit une colonne normale ===
    data.reset_index(inplace=True)

    # === Sélection dynamique des colonnes à exporter ===
    columns = ['Datetime', 'Open', 'High', 'Low', 'Close', 'Volume', 'RSI_14']
    if ADD_EMA:
        columns += ['EMA_50', 'EMA_200']

    df_clean = data[columns].dropna()

    # === Sauvegarde CSV propre ===
    df_clean.to_csv(output_filename, index=False, encoding='utf-8')
    print(f"✅ Données extraites et sauvegardées dans : {output_filename}")

    return df_clean

if __name__ == "__main__":
    extract_data()
