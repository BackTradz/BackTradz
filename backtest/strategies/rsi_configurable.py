
import pandas as pd

def detect_rsi_signals(df, rsi_threshold=20):
    """
    Stratégie RSI configurable :
    - Buy si RSI < rsi_threshold
    - Sell si RSI > (100 - rsi_threshold)
    """
    signals = []

    for i in range(len(df)):
        rsi = df["RSI"].iloc[i]

        if rsi < rsi_threshold:
            signals.append({
                "time": df.index[i],
                "entry": df["Close"].iloc[i],
                "direction": "buy",
                "rsi": rsi
            })
        elif rsi > (100 - rsi_threshold):
            signals.append({
                "time": df.index[i],
                "entry": df["Close"].iloc[i],
                "direction": "sell",
                "rsi": rsi
            })

    return signals
