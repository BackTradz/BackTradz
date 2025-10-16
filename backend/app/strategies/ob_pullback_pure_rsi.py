# [BTZ] Patch 2025-09-09
# - Retire rsi_key et time_key de la signature
# - Fige RSI_COL = "RSI" et TIME_COL = "Datetime"
# - Conserve rsi_threshold
# - Logique inchangée, 0 régression

import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_pure_rsi(
    data: Union[pd.DataFrame, List[Dict]],
    min_wait_candles: int = 3,
    max_wait_candles: int = 20,
    allow_multiple_entries: bool = False,
    rsi_threshold: float = 40.0,
    **kwargs,  # [BTZ] compat descendante : ex-args rsi_key/time_key ignorés
) -> List[Dict]:
    """
    OB (sans gap) + retour dans OB + filtre RSI global.
    - BUY si RSI < threshold
    - SELL si RSI > 100 - threshold
    """
    TIME_COL = "Datetime"  # [BTZ]
    RSI_COL = "RSI"        # [BTZ]

    if isinstance(data, pd.DataFrame):
        data = data.reset_index().to_dict(orient="records")

    signals: List[Dict] = []
    active_ob = None
    wait_count = 0
    ob_direction = None

    for i in range(3, len(data)):
        current = data[i]
        ob_candle = data[i - 2]
        pre_ob = data[i - 3]

        # Détection OB simple
        if active_ob is None:
            # OB bullish
            if pre_ob["Close"] < pre_ob["Open"] and ob_candle["Close"] > ob_candle["Open"]:
                active_ob = {
                    "ob_high": ob_candle["Open"],
                    "ob_low": ob_candle["Close"],
                    "start_index": i,
                    "touched": False
                }
                ob_direction = "buy"
                wait_count = 0

            # OB bearish
            elif pre_ob["Close"] > pre_ob["Open"] and ob_candle["Close"] < ob_candle["Open"]:
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
            if wait_count > max_wait_candles and not active_ob["touched"]:
                active_ob = None
                continue

            rsi_val = current.get(RSI_COL)
            if rsi_val is None:
                continue

            if ob_direction == "buy" and rsi_val < rsi_threshold:
                if current["Low"] <= active_ob["ob_high"] and current["High"] >= active_ob["ob_low"]:
                    if wait_count >= min_wait_candles:
                        signals.append({
                            "time": current.get(TIME_COL, current.get("time")),
                            "entry": active_ob["ob_high"],
                            "direction": "buy",
                            "phase": "TP1"
                        })
                        active_ob["touched"] = True
                        if not allow_multiple_entries:
                            active_ob = None

            elif ob_direction == "sell" and rsi_val > (100 - rsi_threshold):
                if current["High"] >= active_ob["ob_low"] and current["Low"] <= active_ob["ob_high"]:
                    if wait_count >= min_wait_candles:
                        signals.append({
                            "time": current.get(TIME_COL, current.get("time")),
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
