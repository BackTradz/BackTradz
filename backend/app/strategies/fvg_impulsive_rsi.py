import pandas as pd

def detect_fvg_impulsive_rsi(df, min_pips=5, confirm_candle=True, rsi_threshold=50, **kwargs):
    """
    FVG + RSI (sans pip_factor).
    - `min_pips` en unités de prix.
    - RSI pris de la colonne 'RSI' si présente; sinon '50' par défaut neutre.
    - `**kwargs` pour compatibilité ascendante.
    """
    ohlc = ["Open", "High", "Low", "Close"]
    df[ohlc] = df[ohlc].apply(pd.to_numeric, errors="coerce")
    if "RSI" in df.columns:
        df["RSI"] = pd.to_numeric(df["RSI"], errors="coerce")
    df.dropna(inplace=True)

    min_gap = float(min_pips)
    signals = []
    last = len(df) - (2 if confirm_candle else 1)

    for i in range(2, last):
        high_0 = df["High"].iloc[i - 2]
        low_0  = df["Low"].iloc[i - 2]
        high_2 = df["High"].iloc[i]
        low_2  = df["Low"].iloc[i]
        rsi    = df["RSI"].iloc[i] if "RSI" in df.columns else 50

        gap_up   = low_2 - high_0
        gap_down = low_0 - high_2

        time_index  = i + (2 if confirm_candle else 1)
        entry_index = i + 1 if confirm_candle else i

        entry_price = df["Close"].iloc[entry_index]
        time_signal = df.index[time_index]

        # Note: seuils simples; adapte si tu as une convention différente
        if gap_up >= min_gap and rsi < rsi_threshold:
            signals.append({"time": time_signal, "entry": entry_price, "direction": "buy",  "gap": round(gap_up, 8)})
        elif gap_down >= min_gap and rsi > (100 - rsi_threshold):
            signals.append({"time": time_signal, "entry": entry_price, "direction": "sell", "gap": round(gap_down, 8)})

    return signals
