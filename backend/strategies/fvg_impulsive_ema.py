import pandas as pd

def detect_fvg_impulsive_ema(
    df,
    min_pips: float = 1,
    confirm_candle: bool = True,
    ema_fast: int = 50,
    ema_slow: int = 200,
    **kwargs
):
    """
    STRAT: FVG + EMA(ema_fast/ema_slow) — sans pip_factor (runner -> unités de prix).
    - EMA dynamiques: réutilise EMA_<period> si présentes, sinon calcule.
    - confirm_candle: si True, on attend 1 bougie de confirmation.
    - **kwargs: absorbe les params legacy (compat).
    """
    # OHLC -> numeric
    ohlc = ["Open", "High", "Low", "Close"]
    df[ohlc] = df[ohlc].apply(pd.to_numeric, errors="coerce")

    # Ensure EMAs
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
    last = len(df) - (2 if confirm_candle else 1)

    for i in range(2, last):
        high_0 = df["High"].iloc[i - 2];  low_0 = df["Low"].iloc[i - 2]
        high_2 = df["High"].iloc[i];      low_2 = df["Low"].iloc[i]

        ema_f  = df[col_fast].iloc[i]
        ema_s  = df[col_slow].iloc[i]

        gap_up   = low_2 - high_0
        gap_down = low_0 - high_2

        time_index  = i + (2 if confirm_candle else 1)
        entry_index = i + 1 if confirm_candle else i

        entry_price = df["Close"].iloc[entry_index]
        time_signal = df.index[time_index]

        if gap_up >= min_gap and ema_f > ema_s:
            signals.append({"time": time_signal, "entry": entry_price, "direction": "buy",  "gap": round(gap_up, 8)})
        elif gap_down >= min_gap and ema_f < ema_s:
            signals.append({"time": time_signal, "entry": entry_price, "direction": "sell", "gap": round(gap_down, 8)})

    return signals
