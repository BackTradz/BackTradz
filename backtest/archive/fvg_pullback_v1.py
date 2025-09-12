
##===V1 obsolete ne prend qune fvg a la fois

from typing import List, Dict

def detect_fvg_pullback(data: List[Dict], min_pips: float = 5.0, min_wait_candles: int = 3, max_touch: int = 1) -> List[Dict]:
    """
    Détecte les setups FVG Pullback sur une liste de données OHLC.

    :param data: Liste de dictionnaires contenant les bougies avec au minimum les clés: 'open', 'high', 'low', 'close'.
    :param min_pips: Taille minimale du gap pour considérer une FVG valide.
    :param min_wait_candles: Nombre de bougies minimum avant qu’un retour dans la FVG soit autorisé.
    :param max_touch: Nombre de retours maximum autorisés dans la zone de FVG.
    :return: Liste de signaux de trade détectés.
    """
    signals = []
    active_fvg = None
    wait_count = 0
    touch_count = 0

    for i in range(2, len(data)):
        candle0 = data[i - 2]
        candle1 = data[i - 1]
        candle2 = data[i]

        # Détection FVG haussière
        if candle0['low'] > candle2['high'] and (candle0['low'] - candle2['high']) >= min_pips:
            active_fvg = {
                'type': 'bullish',
                'start': candle2['high'],
                'end': candle0['low'],
                'index': i,
            }
            wait_count = 0
            touch_count = 0
            continue

        # Détection FVG baissière
        elif candle0['high'] < candle2['low'] and (candle2['low'] - candle0['high']) >= min_pips:
            active_fvg = {
                'type': 'bearish',
                'start': candle0['high'],
                'end': candle2['low'],
                'index': i,
            }
            wait_count = 0
            touch_count = 0
            continue

        # Si FVG active, on attend un retour
        if active_fvg:
            wait_count += 1

            if wait_count >= min_wait_candles:
                # Vérifie retour dans la zone
                if active_fvg['type'] == 'bullish' and candle2['low'] <= active_fvg['end']:
                    touch_count += 1
                    if touch_count <= max_touch:
                        signals.append({
                            'signal': 'buy',
                            'price': active_fvg['end'],
                            'index': i,
                            'fvg': active_fvg,
                        })
                        active_fvg = None
                elif active_fvg['type'] == 'bearish' and candle2['high'] >= active_fvg['start']:
                    touch_count += 1
                    if touch_count <= max_touch:
                        signals.append({
                            'signal': 'sell',
                            'price': active_fvg['start'],
                            'index': i,
                            'fvg': active_fvg,
                        })
                        active_fvg = None

    return signals
