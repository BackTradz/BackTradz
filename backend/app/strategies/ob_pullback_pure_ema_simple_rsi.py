# [BTZ] Patch 2025-09-09
# - Retire rsi_key et time_key de la signature
# - Fige RSI_COL = "RSI" et TIME_COL = "Datetime"
# - Conserve ema_key et rsi_threshold
# - Logique inchangée, 0 régression

import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_pure_ema_simple_rsi(
    data: Union[pd.DataFrame, List[Dict]],
    min_wait_candles: int = 3,
    max_wait_candles: int = 20,
    allow_multiple_entries: bool = False,
    ema_key: str = "EMA_50",
    rsi_threshold: float = 40.0,
    min_overlap_ratio: float = 0.01,  # [BTZ] défaut pro
    **kwargs,  # [BTZ] compat descendante : ex-args rsi_key/time_key ignorés
) -> List[Dict]:
    """
    OB sans gap + retour dans OB + EMA simple + filtre RSI global.
    - BUY si Close > EMA and RSI < threshold
    - SELL si Close < EMA and RSI > 100 - threshold
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

        # Détection OB simple (sans gap)
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

            # [ADD min_overlap_ratio BTZ-2025-10]
            low_b  = min(active_ob["ob_high"], active_ob["ob_low"])
            high_b = max(active_ob["ob_high"], active_ob["ob_low"])
            zone_w = high_b - low_b
            if zone_w <= 0:
                continue
            overlap = max(0.0, min(current["High"], high_b) - max(current["Low"], low_b))
            _ratio = float(min_overlap_ratio)
            meets_depth = (overlap / zone_w) >= _ratio if _ratio > 0 else (overlap > 1e-9)

            ema_val = current.get(ema_key)
            rsi_val = current.get(RSI_COL)
            close = current.get("Close")
            if ema_val is None or rsi_val is None or close is None:
                continue

            if ob_direction == "buy" and close > ema_val and rsi_val < rsi_threshold:
                if meets_depth:
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

            elif ob_direction == "sell" and close < ema_val and rsi_val > (100 - rsi_threshold):
                if meets_depth:
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
