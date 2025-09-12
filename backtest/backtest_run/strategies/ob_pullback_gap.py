import pandas as pd
from typing import List, Dict, Union

def detect_ob_pullback_gap(data: Union[pd.DataFrame, List[Dict]],
                           min_wait_candles: int = 3,
                           max_wait_candles: int = 20,
                           allow_multiple_entries: bool = False,
                           time_key: str = "Datetime") -> List[Dict]:
    """
    Détection OB* (Order Block + GAP) + retour dans l'OB.
    Valide un OB uniquement s'il est suivi immédiatement d'un GAP (pas de chevauchement).
    Ensuite, attend un retour dans l'OB pour générer un signal.

    :param data: Données OHLC avec colonnes "Open", "High", "Low", "Close", et "Datetime"
    """
    if isinstance(data, pd.DataFrame):
        data = data.reset_index().to_dict(orient="records")

    signals = []
    active_ob = None
    wait_count = 0
    ob_direction = None

    for i in range(4, len(data)):
        current = data[i]
        prev = data[i - 1]
        ob_candle = data[i - 2]
        pre_ob = data[i - 3]

        # === 1. Détection OB + GAP → OB*
        if active_ob is None:
            # OB* haussier
            if pre_ob["Close"] < pre_ob["Open"] and \
               ob_candle["Close"] > ob_candle["Open"] and \
               prev["Close"] > prev["Open"] and \
               ob_candle["Open"] > pre_ob["Close"]:
                # GAP haussier validé ?
                if prev["Low"] > ob_candle["High"]:
                    active_ob = {
                        "ob_high": ob_candle["Open"],
                        "ob_low": ob_candle["Close"],
                        "start_index": i,
                        "touched": False
                    }
                    ob_direction = "buy"
                    wait_count = 0

            # OB* baissier
            elif pre_ob["Close"] > pre_ob["Open"] and \
                 ob_candle["Close"] < ob_candle["Open"] and \
                 prev["Close"] < prev["Open"] and \
                 ob_candle["Open"] < pre_ob["Close"]:
                # GAP baissier validé ?
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

            if ob_direction == "buy":
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

            elif ob_direction == "sell":
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
