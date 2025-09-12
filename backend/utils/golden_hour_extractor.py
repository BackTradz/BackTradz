"""
File: backend/utils/golden_hour_extractor.py
Role: Extraire, depuis l'onglet 'Par_Heure' d’un XLSX d’analyse, le winrate global
      et les 3 heures avec le meilleur TP1.
Depends:
  - Fichier Excel d’analyse (onglet 'Par_Heure' avec colonnes 'hour' et 'winrate')
Returns:
  - dict { winrate_global: {TP1, TP2?}, golden_hours: [{hour, TP1}, ...] } ou None.
"""

import pandas as pd
from typing import Optional

def extract_golden_hours(xlsx_path: str) -> Optional[dict]:
    """
    Analyse un fichier .xlsx de backtest (onglet "Par_Heure") et extrait :
    - Le winrate global TP1 (moyenne de la colonne 'winrate')
    - Les 3 meilleures heures (tri descendant)

    Args:
        xlsx_path (str): chemin du fichier Excel.

    Returns:
        Optional[dict]: structure exploitable par le frontend, sinon None en cas d’erreur.
    """
    try:
        df = pd.read_excel(xlsx_path, sheet_name="Par_Heure")

        # Vérifie la présence des colonnes minimales
        if "hour" not in df.columns or "winrate" not in df.columns:
            print(f"❌ Colonnes nécessaires manquantes dans : {df.columns.tolist()}")
            return None

        df["winrate"] = pd.to_numeric(df["winrate"], errors="coerce")
        df.dropna(subset=["winrate"], inplace=True)

        # Top 3 heures
        top_hours = df.sort_values(by="winrate", ascending=False).head(3)

        golden_hours = []
        for _, row in top_hours.iterrows():
            golden_hours.append({
                "hour": int(row["hour"]),
                "TP1": round(row["winrate"], 2)
            })

        # Moyenne globale
        winrate_global = round(df["winrate"].mean(), 2)

        return {
            "winrate_global": {
                "TP1": float(winrate_global),
                "TP2": None  # pas traité ici
            },
            "golden_hours": golden_hours
        }

    except Exception as e:
        print(f"❌ Erreur extraction golden hours : {e}")
        return None
