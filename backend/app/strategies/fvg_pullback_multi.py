import pandas as pd
from typing import List, Dict, Union

def detect_fvg_pullback_multi(
    data: Union[pd.DataFrame, List[Dict]],
    min_pips: float = 5.0,
    min_wait_candles: int = 1,
    max_wait_candles: int = 20,
    max_touch: int = 4,
    min_overlap_ratio: float = 0.01  # [BTZ] défaut aligné OB = 1% (anti-bruit)
) -> List[Dict]:
    """
    Détection multi-FVG avec pullback : plusieurs FVG peuvent être actives en parallèle et sont consommées
    si touchées après min_wait_candles ou expirées après max_wait_candles.
    cette strategie detect une fvg (min) retiens chaque fvg attend "min_wait candle" avant de considere le pull back 
    et max touch plus supression apres max_wait candle

    :param data: DataFrame OU List[Dict] avec colonnes 'High', 'Low', 'Open', 'Close', 'Datetime'
    :param min_pips: Gap minimal (en pips) pour valider une FVG
    :param min_wait_candles: Nombre de bougies à attendre avant qu’un retour soit autorisé
    :param max_wait_candles: Délai maximum d'attente pour qu'une FVG soit touchée
    :param max_touch: Nombre maximal de fois qu'une FVG peut être touchée avant d'être invalidée
    :return: Liste de signaux détectés au format runner
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

            # FVG expirée ?
            if fvg["age"] > max_wait_candles:
                valid = False

            # Entrée uniquement après min_wait_candles
            elif fvg["age"] >= min_wait_candles:
                # [ADD min_overlap_ratio BTZ-2025-10] profondeur de retour dans la zone
                low_b  = min(fvg["start"], fvg["end"])
                high_b = max(fvg["start"], fvg["end"])
                zone_w = high_b - low_b
                if zone_w <= 0:
                    continue
                overlap = max(0.0, min(high2, high_b) - max(low2, low_b))
                if min_overlap_ratio > 0:
                    meets_depth = (overlap / zone_w) >= min_overlap_ratio
                else:
                    # garde anti-bruit (touch "réel")
                    meets_depth = overlap > 1e-9

                if fvg["type"] == "bullish" and meets_depth:
                    fvg["touch_count"] += 1
                    if fvg["touch_count"] <= max_touch:
                        signals.append({
                            "time": candle2.get("Datetime", candle2.get("time")),  # fallback safe
                            "entry": fvg["end"],
                            "direction": "buy"
                        })
                        continue
                    else:
                        valid = False

                elif fvg["type"] == "bearish" and meets_depth:
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
