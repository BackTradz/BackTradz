import pandas as pd
from typing import List, Dict, Union

def detect_fvg_pullback_tendance_ema_rsi(data: Union[pd.DataFrame, List[Dict]],
                                      min_pips: float = 5.0,
                                      min_wait_candles: int = 1,
                                      max_wait_candles: int = 20,
                                      max_touch: int = 4,
                                      ema_fast: str = "EMA_50",
                                      ema_slow: str = "EMA_200",
                                      rsi_key: str = "RSI",
                                      rsi_threshold: float = 30.0) -> List[Dict]:
    """
    Détection multi-FVG avec double filtre EMA + RSI :
    - BUY si EMA_fast > EMA_slow ET RSI < threshold
    - SELL si EMA_fast < EMA_slow ET RSI > (100 - threshold)
    """
    if isinstance(data, pd.DataFrame):
        data = data.reset_index().to_dict(orient="records")

    signals = []
    active_fvgs = []

    for i in range(2, len(data)):
        candle0 = data[i - 2]
        candle2 = data[i]

        high0 = float(candle0["High"])
        low0 = float(candle0["Low"])
        high2 = float(candle2["High"])
        low2 = float(candle2["Low"])
        time = candle2["Datetime"]

        # Détection FVG haussière
        if low0 > high2 and (low0 - high2) >= min_pips * 0.0001:
            active_fvgs.append({
                "type": "bullish",
                "start": high2,
                "end": low0,
                "created_index": i,
                "created_time": time,
                "touch_count": 0,
                "age": 0
            })

        # Détection FVG baissière
        elif high0 < low2 and (low2 - high0) >= min_pips * 0.0001:
            active_fvgs.append({
                "type": "bearish",
                "start": high0,
                "end": low2,
                "created_index": i,
                "created_time": time,
                "touch_count": 0,
                "age": 0
            })

        # Vérification des FVG actives
        still_active = []
        for fvg in active_fvgs:
            fvg["age"] += 1
            valid = True

            if fvg["age"] > max_wait_candles:
                valid = False

            elif fvg["age"] >= min_wait_candles:
                rsi = candle2.get(rsi_key)
                ema_fast_val = candle2.get(ema_fast)
                ema_slow_val = candle2.get(ema_slow)

                if rsi is None or ema_fast_val is None or ema_slow_val is None:
                    continue

                # BUY condition
                if (fvg["type"] == "bullish" and low2 <= fvg["end"] and
                    rsi < rsi_threshold and ema_fast_val > ema_slow_val):
                    fvg["touch_count"] += 1
                    if fvg["touch_count"] <= max_touch:
                        signals.append({
                            "time": time,
                            "entry": fvg["end"],
                            "direction": "buy"
                        })
                        continue
                    else:
                        valid = False

                # SELL condition
                elif (fvg["type"] == "bearish" and high2 >= fvg["start"] and
                      rsi > (100 - rsi_threshold) and ema_fast_val < ema_slow_val):
                    fvg["touch_count"] += 1
                    if fvg["touch_count"] <= max_touch:
                        signals.append({
                            "time": time,
                            "entry": fvg["start"],
                            "direction": "sell"
                        })
                        continue
                    else:
                        valid = False

            if valid:
                still_active.append(fvg)

        active_fvgs = still_active

    return signals
