
###====V4.3


import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# === CONFIGURATION ===
FILENAME = "backtest_results.csv"
STRATEGY_NAME = "fvg_pullback_muklti_sl70"   ####==== à adapter
PIP_FACTOR = 1.0  # 0.01 si paire JPY, 0.0001 pour forex GBP EUR etc, 1.0 pour BTC

# === CHARGEMENT DES DONNÉES ===
df = pd.read_csv(FILENAME)
df["time"] = pd.to_datetime(df["time"], errors="coerce")
df.dropna(subset=["time"], inplace=True)
df["hour"] = df["time"].dt.hour
df["date"] = df["time"].dt.date
df["day_name"] = df["time"].dt.day_name()

# Conversion SL/TP en pips
if "sl_size" in df.columns:
    df["sl_size_pips"] = (df["sl_size"] / PIP_FACTOR).round(1)
if "tp1_size" in df.columns:
    df["tp1_size_pips"] = (df["tp1_size"] / PIP_FACTOR).round(1)

df_tp1 = df[df["phase"] == "TP1"]
df_tp2 = df[df["phase"] == "TP2"]

# === GLOBAL TP1 ===
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

# === NOUVELLES MÉTRIQUES
avg_sl_size = round(df_tp1["sl_size_pips"].mean(), 1) if "sl_size_pips" in df_tp1 else None
avg_tp1_size = round(df_tp1["tp1_size_pips"].mean(), 1) if "tp1_size_pips" in df_tp1 else None
avg_rr_tp1 = round(df_tp1["rr_tp1"].mean(), 2) if "rr_tp1" in df_tp1 else None
avg_rr_tp2 = round(df_tp2["rr_tp2"].mean(), 2) if "rr_tp2" in df_tp2 else None

# === SESSIONS
def get_session(hour):
    if 0 <= hour < 8:
        return "Asia"
    elif 8 <= hour < 16:
        return "London"
    else:
        return "New York"
    
df_tp1 = df_tp1.copy()
df_tp1["session"] = df_tp1["hour"].apply(get_session)



session_stats = df_tp1.groupby("session")["result"].value_counts().unstack(fill_value=0)
session_stats["total"] = session_stats.sum(axis=1)
session_stats["winrate"] = (session_stats["TP1"] / session_stats["total"] * 100).round(1)
session_stats = session_stats[["TP1", "SL", "total", "winrate"]].reset_index()

# === GLOBAL STATS
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

# === WINRATE PAR HEURE
hourly = df_tp1.groupby("hour")["result"].value_counts().unstack(fill_value=0)
hourly["total"] = hourly.sum(axis=1)
hourly["winrate"] = (hourly["TP1"] / hourly["total"] * 100).round(1)
hourly = hourly[["TP1", "SL", "total", "winrate"]].reset_index()

# === HEATMAP PAR HEURE
plt.figure(figsize=(6, 8))
sns.heatmap(hourly.set_index("hour")[["winrate"]], annot=True, cmap="YlGnBu", fmt=".1f", linewidths=0.3, linecolor="gray")
plt.title("Winrate par Heure")
plt.tight_layout()
plt.savefig(f"{STRATEGY_NAME}_heatmap_par_heure.png")
plt.close()


# === WINRATE PAR JOUR DE LA SEMAINE
day_summary = df_tp1.groupby("day_name")["result"].value_counts().unstack(fill_value=0)
day_summary["total"] = day_summary.sum(axis=1)
day_summary["winrate"] = (day_summary["TP1"] / day_summary["total"] * 100).round(1)
day_summary = day_summary[["TP1", "SL", "total", "winrate"]].reset_index()

# === GLOBAL TP2
tp2_total = len(df_tp2)
tp2_tp = (df_tp2["result"] == "TP2").sum()
tp2_sl = (df_tp2["result"] == "SL").sum()
tp2_none = (df_tp2["result"] == "NONE").sum()
tp2_winrate = round((tp2_tp / tp2_total) * 100, 2) if tp2_total > 0 else 0

tp2_stats = pd.DataFrame({
    "Metric": ["Total Trades", "TP2", "SL", "NONE", "Winrate TP2"],
    "Value": [tp2_total, tp2_tp, tp2_sl, tp2_none, tp2_winrate]
})

import os

# === Nom du dossier de sortie à personnaliser ici ===
custom_folder_name = f"BTC(15-04,15-05-25)m5_{STRATEGY_NAME}"  # change juste cette ligne
output_dir = os.path.join("resultat_analyse", custom_folder_name)
os.makedirs(output_dir, exist_ok=True)

# === EXPORTS ===
global_stats.to_csv(os.path.join(output_dir, f"{STRATEGY_NAME}_global.csv"), index=False)
session_stats.to_csv(os.path.join(output_dir, f"{STRATEGY_NAME}_sessions.csv"), index=False)
hourly.to_csv(os.path.join(output_dir, f"{STRATEGY_NAME}_par_heure.csv"), index=False)
day_summary.to_csv(os.path.join(output_dir, f"{STRATEGY_NAME}_jour_semaine.csv"), index=False)
tp2_stats.to_csv(os.path.join(output_dir, f"{STRATEGY_NAME}_tp2_global.csv"), index=False)

with pd.ExcelWriter(os.path.join(output_dir, f"analyse_{STRATEGY_NAME}_resultats.xlsx")) as writer:
    global_stats.to_excel(writer, sheet_name="Global", index=False)
    session_stats.to_excel(writer, sheet_name="Sessions", index=False)
    hourly.to_excel(writer, sheet_name="Par_Heure", index=False)
    day_summary.to_excel(writer, sheet_name="Jour_Semaine", index=False)
    tp2_stats.to_excel(writer, sheet_name="TP2_Global", index=False)


print("✅ Analyse V4.3 : sortie pips / heatmap heure / jour semaine OK.")
