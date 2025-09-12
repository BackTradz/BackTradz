
 ###==== Analyseur V5

from pathlib import Path
import json
import os
import shutil
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# === CONFIGURATION ===
CSV_FOLDER = "../Analyse_result/backtest_result"
EXPORT_FOLDER = "../Analyse_result/Analyse_result"
PIP_FACTOR = 0.1  # À adapter selon la paire si nécessaire (XAU=0.1,jpy=0.01,GBP etc=0.0001)

def get_session(hour):
    if 0 <= hour < 8:
        return "Asia"
    elif 8 <= hour < 16:
        return "London"
    else:
        return "New York"

def analyze_file(csv_path, export_dir, STRATEGY_NAME):
    # Lecture CSV
    try:
        df = pd.read_csv(csv_path)
    except pd.errors.EmptyDataError:
        print(f"Fichier vide ignoré: {csv_path}")
        return

    # Skip si pas assez de lignes
    if len(df) < 5:
        print(f"❌ Pas assez de données dans : {csv_path} ({len(df)} lignes)")
        with open("skipped.txt", "a") as log:
            log.write(f"{csv_path} - seulement {len(df)} lignes\n")
        return

    # Préparation des colonnes
    df["time"] = pd.to_datetime(df["time"], errors="coerce")
    df.dropna(subset=["time"], inplace=True)
    df["hour"] = df["time"].dt.hour
    df["date"] = df["time"].dt.date
    df["day_name"] = df["time"].dt.day_name()

    if "sl_size" in df.columns:
        df["sl_size_pips"] = (df["sl_size"] / PIP_FACTOR).round(1)
    if "tp1_size" in df.columns:
        df["tp1_size_pips"] = (df["tp1_size"] / PIP_FACTOR).round(1)

    df_tp1 = df[df["phase"] == "TP1"]
    df_tp2 = df[df["phase"] == "TP2"]

    total_trades = len(df_tp1)
    tp = (df_tp1["result"] == "TP1").sum()
    sl = (df_tp1["result"] == "SL").sum()
    none = (df_tp1["result"] == "NONE").sum()
    winrate = round((tp / (tp + sl)) * 100, 2) if (tp + sl) > 0 else 0

    buy_count = (df_tp1["direction"] == "buy").sum()
    sell_count = (df_tp1["direction"] == "sell").sum()
    buy_pct = round(buy_count / total_trades * 100, 2)
    sell_pct = round(sell_count / total_trades * 100, 2)

    buy_winrate = round((df_tp1[(df_tp1["direction"] == "buy") & (df_tp1["result"] == "TP1")].shape[0] /
                         df_tp1[df_tp1["direction"] == "buy"].shape[0]) * 100, 2) if buy_count > 0 else 0
    sell_winrate = round((df_tp1[(df_tp1["direction"] == "sell") & (df_tp1["result"] == "TP1")].shape[0] /
                          df_tp1[df_tp1["direction"] == "sell"].shape[0]) * 100, 2) if sell_count > 0 else 0

    avg_sl_size = round(df_tp1["sl_size_pips"].mean(), 1) if "sl_size_pips" in df_tp1 else None
    avg_tp1_size = round(df_tp1["tp1_size_pips"].mean(), 1) if "tp1_size_pips" in df_tp1 else None
    avg_rr_tp1 = round(df_tp1["rr_tp1"].mean(), 2) if "rr_tp1" in df_tp1 else None
    avg_rr_tp2 = round(df_tp2["rr_tp2"].mean(), 2) if "rr_tp2" in df_tp2 else None

    df_tp1 = df_tp1.copy()
    df_tp1["session"] = df_tp1["hour"].apply(get_session)

    # SESSION STATS sécurisé
    session_stats = df_tp1.groupby("session")["result"].value_counts().unstack(fill_value=0)
    for col in ["TP1", "TP2", "SL", "entry"]:
        if col not in session_stats.columns:
            session_stats[col] = 0
    session_stats["total"] = session_stats.sum(axis=1)
    session_stats["winrate"] = (session_stats["TP1"] / session_stats["total"] * 100).round(1)
    session_stats = session_stats[["TP1", "SL", "total", "winrate"]].reset_index()

    # GLOBAL STATS
    global_stats = pd.DataFrame({
        "Metric": [
            "Total Trades", "TP1", "SL", "NONE",
            "Winrate Global", "% Buy", "% Sell",
            "Buy Winrate", "Sell Winrate",
            "SL Size (avg, pips)", "TP1 Size (avg, pips)", "RR TP1 (avg)", "RR TP2 (avg)"
        ],
        "Value": [
            total_trades, tp, sl, none,
            winrate, buy_pct, sell_pct,
            buy_winrate, sell_winrate,
            avg_sl_size, avg_tp1_size, avg_rr_tp1, avg_rr_tp2
        ]
    })

    # HOURLY sécurisé
    hourly = df_tp1.groupby("hour")["result"].value_counts().unstack(fill_value=0)
    for col in ["TP1", "TP2", "SL", "entry"]:
        if col not in hourly.columns:
            hourly[col] = 0
    hourly["total"] = hourly.sum(axis=1)
    hourly["winrate"] = (hourly["TP1"] / hourly["total"] * 100).round(1)
    hourly = hourly[["TP1", "SL", "total", "winrate"]].reset_index()

    # DAY STATS sécurisé
    day_summary = df_tp1.groupby("day_name")["result"].value_counts().unstack(fill_value=0)
    for col in ["TP1", "TP2", "SL", "entry"]:
        if col not in day_summary.columns:
            day_summary[col] = 0
    day_summary["total"] = day_summary.sum(axis=1)
    day_summary["winrate"] = (day_summary["TP1"] / day_summary["total"] * 100).round(1)
    day_summary = day_summary[["TP1", "SL", "total", "winrate"]].reset_index()

    # TP2 STATS
    tp2_total = len(df_tp2)
    tp2_tp = (df_tp2["result"] == "TP2").sum()
    tp2_sl = (df_tp2["result"] == "SL").sum()
    tp2_none = (df_tp2["result"] == "NONE").sum()
    tp2_winrate = round((tp2_tp / tp2_total) * 100, 2) if tp2_total > 0 else 0

    tp2_stats = pd.DataFrame({
        "Metric": ["Total Trades", "TP2", "SL", "NONE", "Winrate TP2"],
        "Value": [tp2_total, tp2_tp, tp2_sl, tp2_none, tp2_winrate]
    })

    # EXPORT
    export_dir = os.path.join(EXPORT_FOLDER, STRATEGY_NAME)
    os.makedirs(export_dir, exist_ok=True)

    global_stats.to_csv(os.path.join(export_dir, f"{STRATEGY_NAME}_global.csv"), index=False)
    session_stats.to_csv(os.path.join(export_dir, f"{STRATEGY_NAME}_sessions.csv"), index=False)
    hourly.to_csv(os.path.join(export_dir, f"{STRATEGY_NAME}_par_heure.csv"), index=False)
    day_summary.to_csv(os.path.join(export_dir, f"{STRATEGY_NAME}_jour_semaine.csv"), index=False)
    tp2_stats.to_csv(os.path.join(export_dir, f"{STRATEGY_NAME}_tp2_global.csv"), index=False)

    with pd.ExcelWriter(os.path.join(export_dir, f"analyse_{STRATEGY_NAME}_resultats.xlsx")) as writer:
        global_stats.to_excel(writer, sheet_name="Global", index=False)
        session_stats.to_excel(writer, sheet_name="Sessions", index=False)
        hourly.to_excel(writer, sheet_name="Par_Heure", index=False)
        day_summary.to_excel(writer, sheet_name="Jour_Semaine", index=False)
        tp2_stats.to_excel(writer, sheet_name="TP2_Global", index=False)

    print(f"✅ Analyse terminée pour : {STRATEGY_NAME}")


def analyze_all():
    base_dir = Path("../Analyse_result/backtest_result")
    export_base = Path("../Analyse_result/Analyse_result")
    csv_name = "backtest_result.csv"

    if not base_dir.exists():
        print(f"❌ Dossier introuvable : {base_dir}")
        return

    count = 0
    for root, dirs, files in os.walk(base_dir):
        root_path = Path(root)
        if csv_name in files:
            csv_path = root_path / csv_name
            json_path = next(root_path.glob("*.json"), None)

            if not json_path or not json_path.exists():
                print(f"⚠️ JSON manquant dans : {root_path}")
                continue

            # Lecture des infos dans le JSON
            with open(json_path, "r", encoding="utf-8") as f:
                meta = json.load(f)

            strategy = meta.get("strategy", "strat").rstrip("-").strip("_")
            pair = meta.get("pair", "XX")
            tf = meta.get("timeframe", "tf")
            period = meta.get("period", "periode")
            
            if not all([strategy, pair, tf, period]):
                print(f"infos manquantes dans le json de : {json_path}")
                continue

            # Nom complet de la stratégie (servira pour nom dossier + fichier)
            clean_period = period.replace("-", ".").replace(",", "_")
            strategy_name = f"{pair}_{clean_period}_{tf}_{strategy}"

            # Crée le dossier d’export final
            export_dir = export_base / strategy_name
            export_dir.mkdir(parents=True, exist_ok=True)

            # Copie le JSON dans le bon dossier
            shutil.copy(json_path, export_dir / json_path.name)

            # Appelle l’analyseur avec les bons chemins et le bon nom
            analyze_file(csv_path, export_dir, strategy_name)
            import stat

            def remove_readonly(func, path, _):
                os.chmod(path, stat.S_IWRITE)
                func(path)

            # Déplace le backtest_result.csv dans le dossier final et supprime le dossier d'origine
            try:
                shutil.copy(csv_path, export_dir / "backtest_result.csv")
                shutil.rmtree(root_path, onerror=remove_readonly)
                print(f"📦 Dossier complet déplacé dans : {export_dir}")
            except Exception as e:
                print(f"❌ Erreur lors du déplacement : {e}")
            count += 1

    if count == 0:
        print("⚠️ Aucun CSV détecté.")
    else:
        print(f"✅ {count} analyse(s) terminée(s).")

if __name__ == "__main__":
    analyze_all()

