import pandas as pd
from typing import List, Dict, Union

def detect_fvg_pullback_tendance_ema(data: Union[pd.DataFrame, List[Dict]], min_pips: float = 5.0,
                                      min_wait_candles: int = 1, max_wait_candles: int = 20,
                                      max_touch: int = 4,
                                      ema_fast: str = "EMA_50", ema_slow: str = "EMA_200") -> List[Dict]:
    """
    Détection multi-FVG avec filtre de tendance EMA : plusieurs FVG peuvent être actives en parallèle et sont
    consommées uniquement si la tendance EMA est respectée (ema_fast > ema_slow pour buy, inverse pour sell).

    pareille que fvg_pullback_multi avec un filtre tendance ema(50/200) en plus 

    :param data: DataFrame ou List[Dict] contenant les bougies + colonnes EMA
    :param min_pips: Taille minimale du gap pour valider une FVG
    :param min_wait_candles: Nombre de bougies à attendre avant d’autoriser un retour
    :param max_wait_candles: Durée max avant expiration de la FVG
    :param max_touch: Nombre max de retours autorisés
    :param ema_fast: Nom de la colonne EMA rapide (ex: "EMA_50")
    :param ema_slow: Nom de la colonne EMA lente (ex: "EMA_200")
    :return: Liste des signaux formatés pour le runner
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

        # === Détection FVG haussière
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

        # === Détection FVG baissière
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

        # === Mise à jour des FVG actives
        still_active = []
        for fvg in active_fvgs:
            fvg["age"] += 1
            valid = True

            if fvg["age"] > max_wait_candles:
                valid = False

            elif fvg["age"] >= min_wait_candles:
                fast = candle2.get(ema_fast)
                slow = candle2.get(ema_slow)

                if fast is None or slow is None:
                    continue  # skip si données manquantes

                # Tendance EMA
                if fvg["type"] == "bullish" and low2 <= fvg["end"] and fast > slow:
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

                elif fvg["type"] == "bearish" and high2 >= fvg["start"] and fast < slow:
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
