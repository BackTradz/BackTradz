import pandas as pd
"""STRATEGI fvg+rsi+ema cette strategie detect un gap(min) entre direct si True+rsi+ema
entree impulsive apres le gap direct si True+ confimation rsi(a configurer) + tendance ema (50/200)
min_pips= min du gap 
"""

def detect_fvg_impulsive_rsi_ema_signals(df, rsi_threshold=50, min_pips=5, confirm_candle=True):
    signals = []


# Conversion sécurisée des colonnes numériques
    df["Open"] = pd.to_numeric(df["Open"], errors="coerce")
    df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
    df["High"] = pd.to_numeric(df["High"], errors="coerce")
    df["Low"] = pd.to_numeric(df["Low"], errors="coerce")
    df["RSI"] = pd.to_numeric(df["RSI"], errors="coerce")
    df.dropna(inplace=True)


    # Ajout des EMA
    df["EMA_50"] = df["Close"].ewm(span=50).mean()
    df["EMA_200"] = df["Close"].ewm(span=200).mean()

    for i in range(2, len(df)):
        high_2 = df.iloc[i - 2]["High"]
        low_0 = df.iloc[i]["Low"]
        high_0 = df.iloc[i]["High"]
        low_2 = df.iloc[i - 2]["Low"]
        close_1 = df.iloc[i - 1]["Close"]
        open_1 = df.iloc[i - 1]["Open"]
        rsi = df.iloc[i]["RSI"]
        ema_50 = df.iloc[i]["EMA_50"]
        ema_200 = df.iloc[i]["EMA_200"]

        is_bullish_candle = close_1 > open_1
        is_bearish_candle = close_1 < open_1

        # === FVG HAUSSIER ===
        if high_2 < low_0 and (low_0 - high_2) * 10000 >= min_pips:
            if rsi < rsi_threshold and ema_50 > ema_200:
                if not confirm_candle or is_bullish_candle:
                    signals.append({
                        "time": df.index[i],
                        "entry": df.iloc[i]["High"],
                        "direction": "buy"
                    })

        # === FVG BAISSIER ===
        if low_2 > high_0 and (low_2 - high_0) * 10000 >= min_pips:
            if rsi > (100 - rsi_threshold) and ema_50 < ema_200:
                if not confirm_candle or is_bearish_candle:
                    signals.append({
                        "time": df.index[i],
                        "entry": df.iloc[i]["Low"],
                        "direction": "sell"
                    })

    return signals
