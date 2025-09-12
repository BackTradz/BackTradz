import pandas as pd
from typing import List, Dict, Union

def detect_fvg_pullback_multi_ema(data: Union[pd.DataFrame, List[Dict]],
                                   min_pips: float = 5.0,
                                   min_wait_candles: int = 1,
                                   max_wait_candles: int = 20,
                                   max_touch: int = 4,
                                   ema_key: str = "EMA_50") -> List[Dict]:
    """
    Détection multi-FVG avec filtre EMA simple :
    - BUY si close > EMA
    - SELL si close < EMA

    :param data: Données OHLC + EMA
    :param min_pips: Taille min du gap
    :param min_wait_candles: Attente avant autorisation de pullback
    :param max_wait_candles: Expiration des FVG
    :param max_touch: Nombre de retours max autorisés
    :param ema_key: Nom de la colonne EMA utilisée pour le filtre
    :return: Liste des signaux au format runner
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
        close2 = float(candle2["Close"])
        time = candle2["Datetime"]

        # FVG haussière
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

        # FVG baissière
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
                ema_val = candle2.get(ema_key)
                if ema_val is None:
                    continue

                if fvg["type"] == "bullish" and low2 <= fvg["end"] and close2 > ema_val:
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

                elif fvg["type"] == "bearish" and high2 >= fvg["start"] and close2 < ema_val:
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
