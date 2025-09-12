import yfinance as yf
import pandas as pd


###===== V3


def extract_data():
    # === Paramètres personnalisables ===
    ticker = "GBPUSD=X"
    interval = "15m"
    start_date = "2025-03-15"
    end_date = "2025-04-15"
    output_filename = "GBPUSD_data_15.03-04_m15.csv"

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

    # === Reset index pour que datetime soit une colonne normale ===
    data.reset_index(inplace=True)

    # === Sélection et réorganisation des colonnes ===
    columns = ['Datetime', 'Open', 'High', 'Low', 'Close', 'Volume', 'RSI_14']
    df_clean = data[columns].dropna()

    # === Sauvegarde CSV propre ===
    df_clean.to_csv(output_filename, index=False, encoding='utf-8')
    print(f"✅ Données extraites et sauvegardées dans : {output_filename}")

    return df_clean

if __name__ == "__main__":
    extract_data()
