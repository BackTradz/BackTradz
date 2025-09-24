import pandas as pd

def detect_fvg_impulsive(df, min_pips=5, confirm_candle=True, **kwargs):
    """
    FVG impulsive (version sans pip_factor).
    - Le runner fournit désormais des paramètres déjà normalisés en unités de prix.
    - `min_pips` est interprété directement comme une distance de prix minimale (min_gap).
    - `**kwargs` absorbe tout paramètre legacy (ex: pip_factor) sans lever d'erreur.
    """
    # Sécurise les colonnes OHLC
    ohlc = ["Open", "High", "Low", "Close"]
    df[ohlc] = df[ohlc].apply(pd.to_numeric, errors="coerce")
    df.dropna(inplace=True)

    # Plus de pip_factor : min_gap = min_pips en unités de prix
    min_gap = float(min_pips)

    signals = []
    # Si on veut confirmer, on attend une bougie de plus
    last = len(df) - (2 if confirm_candle else 1)

    for i in range(2, last):
        # FVG classique: compare bar i-2 et i
        high_0 = df["High"].iloc[i - 2]
        low_0  = df["Low"].iloc[i - 2]
        high_2 = df["High"].iloc[i]
        low_2  = df["Low"].iloc[i]

        gap_up   = low_2 - high_0     # vide haussier
        gap_down = low_0 - high_2     # vide baissier

        time_index  = i + (2 if confirm_candle else 1)   # index de temps du signal
        entry_index = i + 1 if confirm_candle else i     # prix d’entrée

        entry_price = df["Close"].iloc[entry_index]
        time_signal = df.index[time_index]

        if gap_up >= min_gap:
            signals.append({"time": time_signal, "entry": entry_price, "direction": "buy",  "gap": round(gap_up, 8)})
        elif gap_down >= min_gap:
            signals.append({"time": time_signal, "entry": entry_price, "direction": "sell", "gap": round(gap_down, 8)})

    return signals
