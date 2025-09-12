
from pathlib import Path
from datetime import datetime, timedelta
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




def extract_data_auto(symbol: str, tf: str, start: str, end: str):
    print(f"📡 Extraction AUTO SIMPLE : {symbol} {tf} {start} → {end}")

    tf_map = {"m5": "5m", "h1": "60m", "d1": "1d"}
    yf_tf = tf_map.get(tf.lower(), "5m")
    yf_symbol = f"{symbol}=X" if not "-" in symbol and symbol != "GC=F" else symbol

    try:
        data = yf.download(yf_symbol, interval=yf_tf, start=start, end=end)
        #print("🧪 type(data):", type(data))
        #print("🧪 data.columns:", getattr(data, 'columns', 'NO COLUMNS'))
        #print("🧪 data.dtypes:\n", getattr(data, 'dtypes', 'NO DTYPES'))
        #print("🧪 Première ligne:\n", data.head(1).to_dict() if isinstance(data, pd.DataFrame) else 'N/A')

        # 🧽 Si les colonnes ont un MultiIndex → on les aplatit
        if isinstance(data.columns, pd.MultiIndex):
            print("⚠️ Colonnes MultiIndex détectées → flatten")
            data.columns = [col[0] for col in data.columns]

        # 🔒 Vérif type et contenu
        if not isinstance(data, pd.DataFrame):
            print("❌ Ce n'est pas un DataFrame")
            return None

        if data.empty or data.shape[0] < 2:
            print("❌ DataFrame vide ou insuffisant :", data.shape)
            return None

        # 🔬 Vérifie que toutes les colonnes OHLC existent
        required_cols = ["Open", "High", "Low", "Close"]
        for col in required_cols:
            if col not in data.columns:
                print(f"❌ Colonne manquante dans la data : {col}")
                return None

        # 🔬 Vérifie que chaque colonne est un vrai array compatible
        try:
            for col in required_cols:
                data[col] = pd.to_numeric(data[col], errors="coerce")
            data.dropna(subset=required_cols, inplace=True)

            # ✅ Reset index et rename colonne temporelle proprement
            data.reset_index(inplace=True)

            # 🔁 Rename index/Date/datetime → "Datetime"
            for possible_time_col in ["index", "Date", "date", "datetime"]:
                if possible_time_col in data.columns and "Datetime" not in data.columns:
                    data.rename(columns={possible_time_col: "Datetime"}, inplace=True)

            if "Datetime" not in data.columns:
                print("❌ Colonne 'Datetime' manquante après reset_index")
                return None

        except Exception as e:
            print(f"❌ Dropna impossible : {e}")
            return None


        # RSI
        delta = data["Close"].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(window=14).mean()
        avg_loss = loss.rolling(window=14).mean()
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        data["RSI_14"] = rsi

        # EMA
        data["EMA_50"] = data["Close"].ewm(span=50).mean()
        data["EMA_200"] = data["Close"].ewm(span=200).mean()

        # Nettoyage
        for col in ["Open", "High", "Low", "Close"]:
            data[col] = pd.to_numeric(data[col], errors="coerce")
        data.dropna(subset=["Open", "High", "Low", "Close"], inplace=True)

        # Sauvegarde
       

        # ✅ Renommage intelligent
        if "Date" in data.columns:
            data.rename(columns={"Date": "Datetime"}, inplace=True)
        elif "index" in data.columns:
            data.rename(columns={"index": "Datetime"}, inplace=True)

        # 🛡️ Check colonne Datetime obligatoire
        if "Datetime" not in data.columns:
            print("❌ Colonne 'Datetime' manquante après reset_index")
            return None

        # ✅ Construction du df final sécurisé
        final_cols = ["Datetime", "Open", "High", "Low", "Close", "Volume", "RSI_14", "EMA_50", "EMA_200"]
        final_cols = [col for col in final_cols if col in data.columns]

        try:
            df_clean = data[final_cols].copy()
        except Exception as e:
            print(f"❌ Erreur construction df_clean : {e}")
            return None

        output_dir = Path(f"backend/output_live/{symbol}/{tf}")
        output_dir.mkdir(parents=True, exist_ok=True)
        name = f"{symbol}_{tf}_{start.replace('-', '')}_to_{end.replace('-', '')}.csv"
        df_clean.to_csv(output_dir / name, index=False)

        print(f"✅ Données extraites et sauvegardées dans : {output_dir / name}")
        return df_clean

    except Exception as e:
        print(f"❌ Erreur extraction auto : {e}")
        return None

