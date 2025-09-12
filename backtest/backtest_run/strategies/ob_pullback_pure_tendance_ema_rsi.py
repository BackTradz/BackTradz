import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_pure_tendance_ema_rsi(data: Union[pd.DataFrame, List[Dict]],
                                              min_wait_candles: int = 3,
                                              max_wait_candles: int = 20,
                                              allow_multiple_entries: bool = False,
                                              ema_fast: str = "EMA_50",
                                              ema_slow: str = "EMA_200",
                                              rsi_key: str = "RSI",
                                              rsi_threshold: float = 40.0,
                                              time_key: str = "Datetime") -> List[Dict]:
    """
    OB sans gap + retour dans OB + filtre EMA tendance + filtre RSI global.
    """
    if isinstance(data, pd.DataFrame):
        data = data.reset_index().to_dict(orient="records")

    signals = []
    active_ob = None
    wait_count = 0
    ob_direction = None

    for i in range(3, len(data)):
        current = data[i]
        ob_candle = data[i - 2]
        pre_ob = data[i - 3]

        # === Détection OB (sans gap)
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

            fast = current.get(ema_fast)
            slow = current.get(ema_slow)
            rsi_val = current.get(rsi_key)

            if fast is None or slow is None or rsi_val is None:
                continue

            if ob_direction == "buy" and fast > slow and rsi_val < rsi_threshold:
                if current["Low"] <= active_ob["ob_high"] and current["High"] >= active_ob["ob_low"]:
                    if wait_count >= min_wait_candles:
                        signals.append({
                            "time": current[time_key],
                            "entry": active_ob["ob_high"],
                            "direction": "buy",
                            "phase": "TP1"
                        })
                        active_ob["touched"] = True
                        if not allow_multiple_entries:
                            active_ob = None

            elif ob_direction == "sell" and fast < slow and rsi_val > (100 - rsi_threshold):
                if current["High"] >= active_ob["ob_low"] and current["Low"] <= active_ob["ob_high"]:
                    if wait_count >= min_wait_candles:
                        signals.append({
                            "time": current[time_key],
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
