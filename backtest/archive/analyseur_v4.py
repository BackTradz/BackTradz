
###===V4

import pandas as pd

# === CONFIGURATION ===
FILENAME = "backtest_results.csv"
STRATEGY_NAME = "OBM5RSI"

# === CHARGEMENT DES DONNÉES ===
try:
    df = pd.read_csv(FILENAME)
except FileNotFoundError:
    print(f"❌ Fichier {FILENAME} introuvable.")
    exit()

df["time"] = pd.to_datetime(df["time"], errors="coerce")
df.dropna(subset=["time"], inplace=True)
df["hour"] = df["time"].dt.hour
df["date"] = df["time"].dt.date

df = df[df["phase"] == "TP1"]  # Ne conserver que les positions TP1

# === SESSIONS ===
def get_session(hour):
    if 0 <= hour < 8:
        return "Asia"
    elif 8 <= hour < 16:
        return "London"
    else:
        return "New York"
df["session"] = df["hour"].apply(get_session)


# === FEUILLE 1 : GLOBAL ===
total_trades = len(df)
tp = (df["result"] == "TP1").sum()
sl = (df["result"] == "SL").sum()
none = (df["result"] == "NONE").sum()
winrate = round((tp / (tp + sl)) * 100, 2) if (tp + sl) > 0 else 0

# Winrate TP1 & TP2 par phase
tp1_phase = df[df["phase"] == "TP1"]
tp2_phase = df[df["phase"] == "TP2"]

winrate_tp1 = round((tp1_phase["result"] == "TP1").sum() / len(tp1_phase) * 100, 2) if len(tp1_phase) > 0 else 0
winrate_tp2 = round((tp2_phase["result"] == "TP2").sum() / len(tp2_phase) * 100, 2) if len(tp2_phase) > 0 else 0

buy_count = (df["direction"] == "buy").sum()
sell_count = (df["direction"] == "sell").sum()
buy_pct = round(buy_count / total_trades * 100, 2)
sell_pct = round(sell_count / total_trades * 100, 2)

buy_winrate = round((df[(df["direction"] == "buy") & (df["result"] == "TP1")].shape[0] /
                     df[df["direction"] == "buy"].shape[0]) * 100, 2) if buy_count > 0 else 0
sell_winrate = round((df[(df["direction"] == "sell") & (df["result"] == "TP1")].shape[0] /
                      df[df["direction"] == "sell"].shape[0]) * 100, 2) if sell_count > 0 else 0

session_stats = df.groupby("session")["result"].value_counts().unstack(fill_value=0)
session_stats["total"] = session_stats.sum(axis=1)
session_stats["winrate"] = (session_stats["TP1"] / session_stats["total"] * 100).round(1)
session_stats = session_stats[["TP1", "SL", "total", "winrate"]].reset_index()

global_stats = pd.DataFrame({
    "Metric": ["Total Trades", "TP1", "SL", "NONE", "Winrate Global", "Winrate TP1", "Winrate TP2", "% Buy", "% Sell", "Buy Winrate", "Sell Winrate"],
    "Value": [total_trades, tp, sl, none, winrate, winrate_tp1, winrate_tp2, buy_pct, sell_pct, buy_winrate, sell_winrate]
})

# === FEUILLE 2 : PAR HEURE ===
hourly = df.groupby("hour")["result"].value_counts().unstack(fill_value=0)
hourly["total"] = hourly.sum(axis=1)
hourly["winrate"] = (hourly["TP1"] / hourly["total"] * 100).round(1)
hourly = hourly[["TP1", "SL", "total", "winrate"]].reset_index()

# === FEUILLE 3 : JOUR + HEURE (>=2 trades) ===
daily_hourly = df.groupby(["date", "hour"])["result"].value_counts().unstack(fill_value=0)
daily_hourly["total"] = daily_hourly.sum(axis=1)
filtered = daily_hourly[daily_hourly["total"] >= 2]

if filtered.empty:
    print("⚠️ Aucun bloc jour+heure avec au moins 2 trades. Export sans filtre.")
    filtered = daily_hourly

filtered["winrate"] = (filtered["TP1"] / filtered["total"] * 100).round(1)
daily_hourly = filtered[["TP1", "SL", "total", "winrate"]].reset_index()

# === EXPORT CSVs ===
global_stats.to_csv(f"{STRATEGY_NAME}_global.csv", index=False)
session_stats.to_csv(f"{STRATEGY_NAME}_sessions.csv", index=False)
hourly.to_csv(f"{STRATEGY_NAME}_par_heure.csv", index=False)
daily_hourly.to_csv(f"{STRATEGY_NAME}_jour_heure.csv", index=False)

# === EXPORT EXCEL ===
with pd.ExcelWriter(f"analyse_{STRATEGY_NAME}_resultats_V4.xlsx") as writer:
    global_stats.to_excel(writer, sheet_name="Global", index=False)
    session_stats.to_excel(writer, sheet_name="Sessions", index=False)
    hourly.to_excel(writer, sheet_name="Par_Heure", index=False)
    daily_hourly.to_excel(writer, sheet_name="Jour_Heure", index=False)

print(f"✅ Export terminé pour la stratégie : {STRATEGY_NAME}")
