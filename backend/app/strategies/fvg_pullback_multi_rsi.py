# [BTZ] Patch 2025-09-09 : suppression de rsi_key dans la signature.
#      La colonne RSI est figée en interne (RSI_COL = "RSI") pour ne plus remonter dans l'UI.
#      Aucune modification de logique métier. 0 régression.

import pandas as pd
from typing import List, Dict, Union

def detect_fvg_pullback_multi_rsi(
    data: Union[pd.DataFrame, List[Dict]],
    min_pips: float = 5.0,
    min_wait_candles: int = 1,
    max_wait_candles: int = 20,
    max_touch: int = 4,
    # rsi_key supprimé de la signature  [BTZ]
    rsi_threshold: float = 30.0,
    min_overlap_ratio: float = 0.0  # [BTZ] TOUCH par défaut
) -> List[Dict]:
    """
    Détection multi-FVG avec filtre RSI global (symétrique) :
    - BUY si RSI < threshold
    - SELL si RSI > (100 - threshold)

    :param data: DataFrame ou List[Dict] contenant OHLC + RSI
    :param min_pips: Taille minimale du gap pour valider une FVG
    :param min_wait_candles: Nombre de bougies à attendre avant d’autoriser un retour
    :param max_wait_candles: Durée max avant expiration de la FVG
    :param max_touch: Nombre max de retours autorisés
    :param rsi_threshold: Seuil RSI global (ex: 30 → buy <30, sell >70)
    :return: Liste des signaux au format runner
    """

    # [BTZ] Constante interne pour la colonne RSI (remplace l'ancien paramètre rsi_key)
    RSI_COL = "RSI"

    if isinstance(data, pd.DataFrame):
        # [BTZ] On travaille sur des dicts par candle comme avant.
        data = data.reset_index().to_dict(orient="records")

    signals: List[Dict] = []
    active_fvgs: List[Dict] = []

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

        # Mise à jour des FVG actives
        still_active: List[Dict] = []
        for fvg in active_fvgs:
            fvg["age"] += 1
            valid = True

            if fvg["age"] > max_wait_candles:
                valid = False

            elif fvg["age"] >= min_wait_candles:
                # [BTZ] Lecture RSI via la constante interne (au lieu de rsi_key passé en param)
                rsi = candle2.get(RSI_COL)
                if rsi is None:
                    # 0 régression : si la colonne RSI manque, on ignore comme avant.
                    continue

                # [ADD min_overlap_ratio BTZ-2025-10]
                low_b  = min(fvg["start"], fvg["end"])
                high_b = max(fvg["start"], fvg["end"])
                zone_w = high_b - low_b
                if zone_w <= 0:
                    continue
                overlap = max(0.0, min(high2, high_b) - max(low2, low_b))
                if min_overlap_ratio > 0:
                    meets_depth = (overlap / zone_w) >= min_overlap_ratio
                else:
                    meets_depth = overlap > 0.0

                # RSI filtre global : buy < threshold / sell > 100 - threshold
                if fvg["type"] == "bullish" and meets_depth and rsi < rsi_threshold:
                    fvg["touch_count"] += 1
                    if fvg["touch_count"] <= max_touch:
                        signals.append({
                            "time": candle2.get("Datetime", candle2.get("time")),
                            "entry": fvg["end"],
                            "direction": "buy"
                        })
                        continue
                    else:
                        valid = False

                elif fvg["type"] == "bearish" and meets_depth and rsi > (100 - rsi_threshold):
                    fvg["touch_count"] += 1
                    if fvg["touch_count"] <= max_touch:
                        signals.append({
                            "time": candle2.get("Datetime", candle2.get("time")),
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
