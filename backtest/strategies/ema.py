
import pandas as pd

def detect_ema_signals(df):
    """
    Détection simple basée sur la tendance EMA.
    Buy si EMA_50 > EMA_200, Sell si EMA_50 < EMA_200.
    """
    signals = []

    for i in range(len(df)):
        ema_50 = df["EMA_50"].iloc[i]
        ema_200 = df["EMA_200"].iloc[i]

        if ema_50 > ema_200:
            signals.append({
                "time": df.index[i],
                "entry": df["Close"].iloc[i],
                "direction": "buy"
            })
        elif ema_50 < ema_200:
            signals.append({
                "time": df.index[i],
                "entry": df["Close"].iloc[i],
                "direction": "sell"
            })

    return signals
