import pandas as pd

def detect_englobante_entry_rsi_ema(
    df,
    rsi_threshold: int = 50,
    ema_fast: int = 50,
    ema_slow: int = 200,
    **kwargs
):
    """
    STRAT: Englobante (3 bougies) + filtre RSI + filtre EMA(ema_fast/ema_slow).
    - EMA dynamiques (défauts 50/200), réutilise EMA_<period> si dispo sinon calcule.
    - RSI: si absent, on tente conversion; sinon on ne filtre pas (RSI=50 neutre).
    - **kwargs pour compat ascendante.
    """

    # Sécurise OHLC
    for col in ("Open", "High", "Low", "Close"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    if "RSI" in df.columns:
        df["RSI"] = pd.to_numeric(df["RSI"], errors="coerce")
    df.dropna(inplace=True)

    def _ensure_ema(df_, period: int) -> str:
        col = f"EMA_{int(period)}"
        if col not in df_.columns:
            df_[col] = df_["Close"].ewm(span=int(period)).mean()
        return col

    col_fast = _ensure_ema(df, ema_fast)
    col_slow = _ensure_ema(df, ema_slow)

    signals = []
    for i in range(2, len(df) - 1):
        high0, low0 = df["High"].iloc[i - 2], df["Low"].iloc[i - 2]
        high1, low1 = df["High"].iloc[i - 1], df["Low"].iloc[i - 1]
        high2, low2 = df["High"].iloc[i],     df["Low"].iloc[i]

        rsi   = df["RSI"].iloc[i] if "RSI" in df.columns else 50
        ema_f = df[col_fast].iloc[i]
        ema_s = df[col_slow].iloc[i]

        # Haussier
        if (low1 < low0 and high1 > high0 and low2 > low1 and high2 > high1
            and rsi < rsi_threshold and ema_f > ema_s):
            signals.append({"time": df.index[i + 1], "entry": df["High"].iloc[i], "direction": "buy"})

        # Baissier
        elif (high1 > high0 and low1 < low0 and high2 < high1 and low2 < low1
              and rsi > (100 - rsi_threshold) and ema_f < ema_s):
            signals.append({"time": df.index[i + 1], "entry": df["Low"].iloc[i], "direction": "sell"})

    return signals
