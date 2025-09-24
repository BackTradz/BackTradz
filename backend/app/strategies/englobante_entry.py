
import pandas as pd
"""
Stratégie englobante_entry.py

Ce script détecte des bougies englobantes (3 bougies) :
- Haussière : englobante + suite immédiate vers le haut
- Baissière : englobante + suite immédiate vers le bas

Entrée dès la 3e bougie. Aucune attente de retour dans la zone.
utilisable dans toute les TF
"""


def detect_englobante_entry(df):

    signals = []

    for i in range(2, len(df) - 1):
        high0 = df["High"].iloc[i - 2]
        low0 = df["Low"].iloc[i - 2]

        high1 = df["High"].iloc[i - 1]
        low1 = df["Low"].iloc[i - 1]

        high2 = df["High"].iloc[i]
        low2 = df["Low"].iloc[i]

        # Bougie englobante haussière
        if low1 < low0 and high1 > high0 and low2 > low1 and high2 > high1:
            signals.append({
                "time": df.index[i + 1],
                "entry": df["High"].iloc[i],
                "direction": "buy"
            })

        # Bougie englobante baissière
        elif high1 > high0 and low1 < low0 and high2 < high1 and low2 < low1:
            signals.append({
                "time": df.index[i + 1],
                "entry": df["Low"].iloc[i],
                "direction": "sell"
            })

    return signals
