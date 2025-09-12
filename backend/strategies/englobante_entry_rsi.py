
import pandas as pd

def detect_englobante_entry_rsi(df, rsi_threshold=50):
    """
   STRATEGIE englobante_entry(3bougies) avec filtre rsi
   entree juste apres l'englobante si rsi est valide 
   utilisable toute TF
    """
    signals = []

    for i in range(2, len(df) - 1):
        high0 = df["High"].iloc[i - 2]
        low0 = df["Low"].iloc[i - 2]

        high1 = df["High"].iloc[i - 1]
        low1 = df["Low"].iloc[i - 1]

        high2 = df["High"].iloc[i]
        low2 = df["Low"].iloc[i]

        rsi = df["RSI"].iloc[i]

        # OB haussier + RSI bas
        if (
            low1 < low0 and high1 > high0 and
            low2 > low1 and high2 > high1 and
            rsi < rsi_threshold
        ):
            signals.append({
                "time": df.index[i + 1],
                "entry": df["High"].iloc[i],
                "direction": "buy",
                "rsi": rsi
            })

        # OB baissier + RSI haut
        elif (
            high1 > high0 and low1 < low0 and
            high2 < high1 and low2 < low1 and
            rsi > (100 - rsi_threshold)
        ):
            signals.append({
                "time": df.index[i + 1],
                "entry": df["Low"].iloc[i],
                "direction": "sell",
                "rsi": rsi
            })

    return signals
