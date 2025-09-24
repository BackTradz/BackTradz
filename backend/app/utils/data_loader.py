"""
File: backend/utils/data_loader.py
Role: Charger des données OHLC depuis le disque (output/ & output_live/) et,
      si nécessaire, déclencher une extraction automatique.
Depends:
  - backend/output/<SYMBOL>/<YYYY-MM>/<SYMBOL>_<TF>_<YYYY-MM>.csv
  - backend/output_live/<SYMBOL>/<TF>/*.csv
  - backend.extract.extract_data.extract_data_auto (fallback extraction)
Side-effects:
  - Lecture de CSV depuis le disque.
Returns:
  - pd.DataFrame indexé par Datetime, avec colonnes OHLC + 'time' (requis par le runner).
Notes:
  - Ne modifie pas la logique. Ajout de docstrings & commentaires uniquement.
"""

import os
from datetime import datetime, timedelta
import pandas as pd
from pathlib import Path
from app.extract.extract_data import extract_data_auto
from app.core.paths import OUTPUT_DIR, OUTPUT_LIVE_DIR  # <- DISK paths


def load_csv_filtered(symbol: str, timeframe: str, start_date: str, end_date: str):
    """
    Charge un unique CSV mensuel depuis backend/output, puis filtre par dates.

    Args:
        symbol (str): ex. "XAU"
        timeframe (str): ex. "m5"
        start_date (str): "YYYY-MM-DD"
        end_date (str): "YYYY-MM-DD"

    Returns:
        pd.DataFrame: index Datetime, colonnes OHLC, filtré entre start_dt et end_dt.
    """
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")

    month_str = start_dt.strftime("%Y-%m")
    # 2 patterns supportés:
    #   A) output/<SYM>/<YYYY-MM>/<SYM>_<TF>_<YYYY-MM>.csv
    #   B) output/<SYM>/<TF>/<SYM>_<TF>_<YYYY-MM>.csv
    candA = OUTPUT_DIR / symbol / month_str / f"{symbol}_{timeframe}_{month_str}.csv"
    candB = OUTPUT_DIR / symbol / timeframe / f"{symbol}_{timeframe}_{month_str}.csv"
    file_path = candA if candA.exists() else candB
    if not file_path.exists():
        raise FileNotFoundError(f"❌ Fichier introuvable : {file_path}")
    # Lecture + nettoyage minimal
    df = pd.read_csv(file_path)
    df = df[df["Open"] != "GBPUSD=X"]  # nettoyage spécifique à ta data source
    for col in ["Open", "High", "Low", "Close"]:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df.dropna(inplace=True)

    # Standardise l'index temporel
    df["Datetime"] = pd.to_datetime(df["Datetime"]).dt.tz_localize(None)
    df.set_index("Datetime", inplace=True)

    # Filtre sur la fenêtre demandée
    return df.loc[start_dt:end_dt]


def load_data_or_extract(symbol: str, timeframe: str, start_date: str, end_date: str):
    """
    Charge et fusionne toutes les données disponibles (output/ + output_live/).
    Si rien n’est trouvé, tente une extraction automatique.

    Args:
        symbol, timeframe, start_date, end_date: paramètres de la période et de l’instrument.

    Returns:
        pd.DataFrame: concat des morceaux trouvés, index Datetime trié, avec colonne 'time'.

    Raises:
        FileNotFoundError / ValueError si aucune donnée exploitable.
    """
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    dfs = []

    print(f"🔎 Recherche des données entre {start_date} et {end_date}")

    # === 1) Lecture mensuelle depuis OUTPUT_DIR (disk)
    month_start = start_dt.replace(day=1)
    current = month_start
    while current <= end_dt:
        month_str = current.strftime("%Y-%m")
        filename = f"{symbol}_{timeframe}_{month_str}.csv"
        # 2 patterns: <SYM>/<YYYY-MM>/... ou <SYM>/<TF>/...
        candA = OUTPUT_DIR / symbol / month_str / filename
        candB = OUTPUT_DIR / symbol / timeframe / filename
        file_path = candA if candA.exists() else candB

        if file_path.exists():
            try:
                print(f"📂 Chargement depuis output : {file_path}")
                df = pd.read_csv(file_path)
                df["Datetime"] = pd.to_datetime(df["Datetime"]).dt.tz_localize(None)
                df.set_index("Datetime", inplace=True)
                dfs.append(df)
            except Exception as e:
                print(f"❌ Erreur lecture output : {e}")

        # Passe au 1er du mois suivant (truc du 28+4 pour gérer tous les mois)
        current = (current.replace(day=28) + pd.Timedelta(days=4)).replace(day=1)

    # === 2) Lecture live depuis OUTPUT_LIVE_DIR/<symbol>/<tf>/*.csv
    live_dir = OUTPUT_LIVE_DIR / symbol / timeframe
    if live_dir.exists():
        for file in live_dir.glob("*.csv"):
            try:
                print(f"📥 Lecture LIVE : {file.name}")
                df = pd.read_csv(file)

                # Supprime lignes parasites (ex: "AUDUSD=" qui trainent)
                df = df[~df.astype(str).apply(lambda row: row.str.contains("AUDUSD=", case=False)).any(axis=1)]

                # Harmonise la colonne temporelle → "Datetime"
                if "Datetime" not in df.columns:
                    if "time" in df.columns:
                        df.rename(columns={"time": "Datetime"}, inplace=True)
                    elif "Date" in df.columns:
                        df.rename(columns={"Date": "Datetime"}, inplace=True)
                    else:
                        raise ValueError(f"❌ Colonne temporelle manquante dans : {file.name}")

                # Nettoyage temporel
                df["Datetime"] = pd.to_datetime(df["Datetime"], errors="coerce").dt.tz_localize(None)
                df.dropna(subset=["Datetime"], inplace=True)
                df.set_index("Datetime", inplace=True)
                df["time"] = df.index  # requis par le runner_core

                # Filtre par fenêtre
                filtered_df = df[(df.index >= start_dt) & (df.index <= end_dt)]
                if not filtered_df.empty:
                    dfs.append(filtered_df)
                    print(f"✅ Portion LIVE ajoutée : {file.name} ({filtered_df.shape[0]} lignes)")

            except Exception as e:
                print(f"❌ Erreur lecture fichier live : {file.name} → {e}")

    # === 3) Fallback extraction automatique si aucun morceau trouvé
    if not dfs:
        print(f"⛏ Aucune donnée trouvée → extraction automatique requise")
        df = extract_data_auto(symbol, timeframe, start_date, end_date)

        if df is None or df.empty:
            raise FileNotFoundError("❌ Aucune donnée extraite")

        # Nettoyages sécurisés (types numériques OHLC)
        if isinstance(df, pd.DataFrame) and not df.empty:
            for col in ["Open", "High", "Low", "Close"]:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
            df.dropna(subset=["Open", "High", "Low", "Close"], inplace=True)
        else:
            raise ValueError("❌ Données extraites invalides ou vides")

        # Harmonisation "Datetime"
        if "Datetime" not in df.columns:
            if "time" in df.columns:
                df.rename(columns={"time": "Datetime"}, inplace=True)
            elif "Date" in df.columns:
                df.rename(columns={"Date": "Datetime"}, inplace=True)
            else:
                raise ValueError("❌ Colonne 'Datetime' introuvable après extraction")

        # Standardisation finale
        for col in ["Open", "High", "Low", "Close"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df.dropna(subset=["Open", "High", "Low", "Close"], inplace=True)
        df["Datetime"] = pd.to_datetime(df["Datetime"]).dt.tz_localize(None)
        df.set_index("Datetime", inplace=True)
        dfs.append(df)

    # === 4) Fusion & déduplication
    valid_dfs = [df for df in dfs if isinstance(df, pd.DataFrame) and not df.empty]
    if not valid_dfs:
        raise FileNotFoundError("❌ Aucun DataFrame valide à fusionner")

    # Première passe (doc héritée) — conservée pour transparence
    full_df = pd.concat(valid_dfs)
    full_df = full_df[~full_df.index.duplicated(keep="first")]
    full_df.sort_index(inplace=True)

    # Deuxième passe (version finale utilisée)
    final_df = pd.concat(valid_dfs).sort_index()
    final_df = final_df[~final_df.index.duplicated(keep="last")]
    final_df = final_df.loc[(final_df.index >= start_dt) & (final_df.index <= end_dt)]
    final_df["time"] = final_df.index  # 🧠 obligatoire pour le runner_core
    print(f"✅ DF final : {final_df.shape}")
    return final_df
