import pandas as pd

def detect_fvg_impulsive_rsi_ema(
    df,
    rsi_threshold: int = 50,
    min_pips: float = 5,
    confirm_candle: bool = True,
    ema_fast: int = 50,
    ema_slow: int = 200,
    **kwargs
):
    """
    STRAT: FVG + RSI + EMA(ema_fast/ema_slow) — sans pip_factor.
    - EMA dynamiques (réutilise EMA_<period> si présentes, sinon calcule).
    - RSI: si absent => 50 (neutre).
    - **kwargs pour compat ascendante.
    """
    # Conversions sûres
    for col in ("Open", "High", "Low", "Close"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    if "RSI" in df.columns:
        df["RSI"] = pd.to_numeric(df["RSI"], errors="coerce")

    def _ensure_ema(df_, period: int) -> str:
        col = f"EMA_{int(period)}"
        if col not in df_.columns:
            df_[col] = df_["Close"].ewm(span=int(period)).mean()
        return col

    col_fast = _ensure_ema(df, ema_fast)
    col_slow = _ensure_ema(df, ema_slow)

    df.dropna(inplace=True)

    min_gap = float(min_pips)
    signals = []

    for i in range(2, len(df)):
        high_2 = df["High"].iloc[i - 2]; low_2 = df["Low"].iloc[i - 2]
        high_0 = df["High"].iloc[i];     low_0 = df["Low"].iloc[i]

        close_1 = df["Close"].iloc[i - 1]; open_1 = df["Open"].iloc[i - 1]
        rsi     = df["RSI"].iloc[i] if "RSI" in df.columns else 50
        ema_f   = df[col_fast].iloc[i]
        ema_s   = df[col_slow].iloc[i]

        is_bullish_candle = close_1 > open_1
        is_bearish_candle = close_1 < open_1

        gap_up   = low_0 - high_2
        gap_down = low_2 - high_0

        # ===== FVG HAUSSIER =====
        if gap_up >= min_gap and rsi < rsi_threshold and ema_f > ema_s:
            if not confirm_candle or is_bullish_candle:
                signals.append({"time": df.index[i], "entry": df["High"].iloc[i], "direction": "buy"})

        # ===== FVG BAISSIER =====
        if gap_down >= min_gap and rsi > (100 - rsi_threshold) and ema_f < ema_s:
            if not confirm_candle or is_bearish_candle:
                signals.append({"time": df.index[i], "entry": df["Low"].iloc[i], "direction": "sell"})

    return signals
