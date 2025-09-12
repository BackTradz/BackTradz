
import pandas as pd

def detect_fvg_impulsive_signals(df, min_pips=5, confirm_candle=True, pip_factor=0.0001):
    """
    Stratégie FVG_impulsive rentre dans le sens du gap(min) attend une confirm candle ou pas 
    entre imediate apres formation gap ou apres confirm candle si true
    - min_pips : taille minimale du gap en pips
    - confirm_candle : True = attendre une bougie après la FVG pour valider
    - pip_factor : valeur d'un pip (ex: 0.0001 pour la plupart des paires)
    """
    df[["Open", "High", "Low", "Close"]] = df[["Open", "High", "Low", "Close"]].apply(pd.to_numeric, errors="coerce")
    signals = []

    for i in range(2, len(df) - (2 if confirm_candle else 1)):
        high_0 = df["High"].iloc[i - 2]
        low_0 = df["Low"].iloc[i - 2]
        high_2 = df["High"].iloc[i]
        low_2 = df["Low"].iloc[i]

        gap_up = low_2 - high_0
        gap_down = low_0 - high_2

        time_index = i + (2 if confirm_candle else 1)
        entry_index = i + 1 if confirm_candle else i

        entry_price = df["Close"].iloc[entry_index]
        time_signal = df.index[time_index]

        # FVG haussière
        if gap_up >= min_pips * pip_factor:
            signals.append({
                "time": time_signal,
                "entry": entry_price,
                "direction": "buy",
                "gap": round(gap_up, 5)
            })

        # FVG baissière
        elif gap_down >= min_pips * pip_factor:
            signals.append({
                "time": time_signal,
                "entry": entry_price,
                "direction": "sell",
                "gap": round(gap_down, 5)
            })

    return signals
