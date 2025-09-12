import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_pure_ema_simple(data: Union[pd.DataFrame, List[Dict]],
                                       min_wait_candles: int = 3,
                                       max_wait_candles: int = 20,
                                       allow_multiple_entries: bool = False,
                                       ema_key: str = "EMA_50",
                                       time_key: str = "Datetime") -> List[Dict]:
    """
    OB sans gap + retour dans OB + filtre EMA simple (prix au-dessus ou en-dessous d'une EMA donnée).
    - BUY si Close > EMA
    - SELL si Close < EMA
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

        # Détection OB simple (pas de gap)
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

            ema_val = current.get(ema_key)
            close = current.get("Close")
            if ema_val is None or close is None:
                continue

            if ob_direction == "buy" and close > ema_val:
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

            elif ob_direction == "sell" and close < ema_val:
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
