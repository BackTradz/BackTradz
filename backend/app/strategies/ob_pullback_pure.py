# [BTZ] Patch 2025-09-09
# - Retire time_key de la signature (UI épurée)
# - Fige la colonne temps en interne : TIME_COL = "Datetime"
# - Logique inchangée, 0 régression

import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_pure(
    data: Union[pd.DataFrame, List[Dict]],
    min_wait_candles: int = 3,
    max_wait_candles: int = 20,
    allow_multiple_entries: bool = False,
    min_overlap_ratio: float = 0.01,  # [BTZ] défaut pro = touche anti-bruit (1 %)
    **kwargs,  # [BTZ] compat descendante : ex-arg time_key ignoré
) -> List[Dict]:
    """
    OB + retour dans l'OB sans exigence de GAP post-OB.
    Détection simplifiée d'Order Block avec retour (pullback pur).
    """
    # [BTZ] Colonne temps figée (remplace l'ancien paramètre time_key)
    TIME_COL = "Datetime"

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

            # [FIX v1.3 wait_count logic BTZ-2025-10]
            if wait_count > max_wait_candles and not active_ob["touched"]:
                active_ob = None
                continue

            # [ADD min_overlap_ratio BTZ-2025-10]
            # Normalise la zone OB et calcule le chevauchement réel de la bougie en cours.
            low_b  = min(active_ob["ob_high"], active_ob["ob_low"])
            high_b = max(active_ob["ob_high"], active_ob["ob_low"])
            zone_w = high_b - low_b
            if zone_w <= 0:
                # zone dégénérée (ne devrait pas arriver) → on ignore proprement
                continue
            overlap = max(0.0, min(current["High"], high_b) - max(current["Low"], low_b))
            # [BTZ-DEPTH] profondeur standardisée (ratio + garde flottant)
            _ratio = float(min_overlap_ratio)
            meets_depth = (overlap / zone_w) >= _ratio if _ratio > 0 else (overlap > 1e-9)

            if ob_direction == "buy":
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

            elif ob_direction == "sell":
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
