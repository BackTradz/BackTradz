
import pandas as pd

def detect_englobante_ema_signals(df):
    """
STRATEGIE englobante_entry(3bougies) avec filtre tendance EMA(50/200)
entree imediate apres englobante+confirmation tendance ema
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

        ema_50 = df["EMA_50"].iloc[i]
        ema_200 = df["EMA_200"].iloc[i]

        # OB haussier + tendance haussière
        if low1 < low0 and high1 > high0 and low2 > low1 and high2 > high1 and ema_50 > ema_200:
            signals.append({
                "time": df.index[i + 1],
                "entry": df["High"].iloc[i],
                "direction": "buy"
            })

        # OB baissier + tendance baissière
        elif high1 > high0 and low1 < low0 and high2 < high1 and low2 < low1 and ema_50 < ema_200:
            signals.append({
                "time": df.index[i + 1],
                "entry": df["Low"].iloc[i],
                "direction": "sell"
            })

    return signals
