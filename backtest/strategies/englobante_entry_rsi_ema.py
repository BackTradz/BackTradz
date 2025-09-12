
import pandas as pd

def detect_englobante_rsi_ema_signals(df, rsi_threshold=50):
    """
    STRATEGIE engobante_entry(3bougies)+confirmation rsi+confirmation tendance ema(50/200)
    entre imediate apres l'englobante
    Requiert : High, Low, RSI, EMA_50, EMA_200
    applicable dans toute les TF

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
        ema_50 = df["EMA_50"].iloc[i]
        ema_200 = df["EMA_200"].iloc[i]

        # OB haussier + RSI bas + EMA haussier
        if (
            low1 < low0 and high1 > high0 and
            low2 > low1 and high2 > high1 and
            rsi < rsi_threshold and
            ema_50 > ema_200
        ):
            signals.append({
                "time": df.index[i + 1],
                "entry": df["High"].iloc[i],
                "direction": "buy"
            })

        # OB baissier + RSI haut + EMA baissier
        elif (
            high1 > high0 and low1 < low0 and
            high2 < high1 and low2 < low1 and
            rsi > (100 - rsi_threshold) and
            ema_50 < ema_200
        ):
            signals.append({
                "time": df.index[i + 1],
                "entry": df["Low"].iloc[i],
                "direction": "sell"
            })

    return signals
