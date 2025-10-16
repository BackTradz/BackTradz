# [BTZ] Patch 2025-09-09
# - Retire time_key de la signature
# - Conserve ema_key (utile côté UI)
# - Fige TIME_COL = "Datetime"
# - Logique inchangée, 0 régression

import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_gap_ema_simple(
    data: Union[pd.DataFrame, List[Dict]],
    min_wait_candles: int = 3,
    max_wait_candles: int = 20,
    allow_multiple_entries: bool = False,
    ema_key: str = "EMA_50",
    **kwargs,  # [BTZ] compat descendante (ex: time_key ignoré)
) -> List[Dict]:
    """
    OB* (gap post-OB) + retour dans OB + filtre EMA simple.
    - BUY si Close > EMA
    - SELL si Close < EMA
    """
    TIME_COL = "Datetime"  # [BTZ]

    if isinstance(data, pd.DataFrame):
        data = data.reset_index().to_dict(orient="records")

    signals: List[Dict] = []
    active_ob = None
    wait_count = 0
    ob_direction = None

    for i in range(4, len(data)):
        current = data[i]
        prev = data[i - 1]
        ob_candle = data[i - 2]
        pre_ob = data[i - 3]

        # === Détection OB* avec GAP
        if active_ob is None:
            # OB* bullish
            if (pre_ob["Close"] < pre_ob["Open"]
                and ob_candle["Close"] > ob_candle["Open"]
                and prev["Close"] > prev["Open"]
                and ob_candle["Open"] > pre_ob["Close"]):
                if prev["Low"] > ob_candle["High"]:
                    active_ob = {
                        "ob_high": ob_candle["Open"],
                        "ob_low": ob_candle["Close"],
                        "start_index": i,
                        "touched": False
                    }
                    ob_direction = "buy"
                    wait_count = 0

            # OB* bearish
            elif (pre_ob["Close"] > pre_ob["Open"]
                  and ob_candle["Close"] < ob_candle["Open"]
                  and prev["Close"] < prev["Open"]
                  and ob_candle["Open"] < pre_ob["Close"]):
                if prev["High"] < ob_candle["Low"]:
                    active_ob = {
                        "ob_high": ob_candle["Close"],
                        "ob_low": ob_candle["Open"],
                        "start_index": i,
                        "touched": False
                    }
                    ob_direction = "sell"
                    wait_count = 0

        else:
            wait_count += 1

            # [FIX v1.3 wait_count logic BTZ-2025-10]
            # On expire une OB trop vieille UNIQUEMENT si elle n'a jamais été touchée.
            # On le fait AVANT toute tentative d'entrée pour éviter les faux-positifs tardifs.
            if wait_count > max_wait_candles and not active_ob["touched"]:
                active_ob = None
                continue

            ema_val = current.get(ema_key)
            if ema_val is None:
                continue

            close = current.get("Close")

            if ob_direction == "buy" and close > ema_val:
                if current["Low"] <= active_ob["ob_high"] and current["High"] >= active_ob["ob_low"]:
                    if wait_count >= min_wait_candles:
                        signals.append({
                            "time": current.get(TIME_COL, current.get("time")),  # fallback safe
                            "entry": active_ob["ob_high"],
                            "direction": "buy",
                            "phase": "TP1"
                        })
                        active_ob["touched"] = True
                        if not allow_multiple_entries:
                            active_ob = None

            elif ob_direction == "sell" and close < ema_val:
                if current["High"] >= active_ob["ob_low"] and current["Low"] <= active_ob["ob_high"]:
                    if wait_count >= min_wait_candles:
                        signals.append({
                            "time": current.get(TIME_COL, current.get("time")),  # fallback safe
                            "entry": active_ob["ob_low"],
                            "direction": "sell",
                            "phase": "TP1"
                        })
                        active_ob["touched"] = True
                        if not allow_multiple_entries:
                            active_ob = None

            if wait_count > max_wait_candles:
                active_ob = None

    return signals
