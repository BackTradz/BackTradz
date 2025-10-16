# [BTZ] Patch 2025-09-09
# - Retire rsi_key et time_key de la signature
# - Fige RSI_COL = "RSI" et TIME_COL = "Datetime"
# - Conserve rsi_threshold dans la signature
# - Logique inchangée, 0 régression

import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_gap_rsi(
    data: Union[pd.DataFrame, List[Dict]],
    min_wait_candles: int = 3,
    max_wait_candles: int = 20,
    allow_multiple_entries: bool = False,
    rsi_threshold: float = 40.0,
    min_overlap_ratio: float = 0.01,  # [BTZ] défaut pro
    **kwargs,  # [BTZ] compat descendante (ex: rsi_key/time_key ignorés)
) -> List[Dict]:
    """
    OB* (gap post-OB) + retour dans OB + filtre RSI global.
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

    for i in range(4, len(data)):
        current = data[i]
        prev = data[i - 1]
        ob_candle = data[i - 2]
        pre_ob = data[i - 3]

        # === 1. Détection OB* avec GAP
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

            # [ADD min_overlap_ratio BTZ-2025-10]
            low_b  = min(active_ob["ob_high"], active_ob["ob_low"])
            high_b = max(active_ob["ob_high"], active_ob["ob_low"])
            zone_w = high_b - low_b
            if zone_w <= 0:
                continue
            overlap = max(0.0, min(current["High"], high_b) - max(current["Low"], low_b))
            _ratio = float(min_overlap_ratio)
            meets_depth = (overlap / zone_w) >= _ratio if _ratio > 0 else (overlap > 1e-9)


            rsi_val = current.get(RSI_COL)
            if rsi_val is None:
                continue

            if ob_direction == "buy" and rsi_val < rsi_threshold:
                if meets_depth:
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

            elif ob_direction == "sell" and rsi_val > (100 - rsi_threshold):
                if meets_depth:
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
