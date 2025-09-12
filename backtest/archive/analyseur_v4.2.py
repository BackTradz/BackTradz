##==V4.2


import pandas as pd

# === CONFIGURATION ===
FILENAME = "backtest_results.csv"
STRATEGY_NAME = "ob_m5_rsi(30)"  ####==== à adapter

# === CHARGEMENT DES DONNÉES ===
df = pd.read_csv(FILENAME)
df["time"] = pd.to_datetime(df["time"], errors="coerce")
df.dropna(subset=["time"], inplace=True)
df["hour"] = df["time"].dt.hour
df["date"] = df["time"].dt.date

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
avg_sl_size = round(df_tp1["sl_size"].mean(), 5) if "sl_size" in df_tp1 else None
avg_tp1_size = round(df_tp1["tp1_size"].mean(), 5) if "tp1_size" in df_tp1 else None
avg_rr_tp1 = round(df_tp1["rr_tp1"].mean(), 2) if "rr_tp1" in df_tp1 else None
avg_rr_tp2 = round(df_tp2["rr_tp2"].mean(), 2) if "rr_tp2" in df_tp2 else None

def get_session(hour):
    if 0 <= hour < 8:
        return "Asia"
    elif 8 <= hour < 16:
        return "London"
    else:
        return "New York"
df_tp1["session"] = df_tp1["hour"].apply(get_session)

session_stats = df_tp1.groupby("session")["result"].value_counts().unstack(fill_value=0)
session_stats["total"] = session_stats.sum(axis=1)
session_stats["winrate"] = (session_stats["TP1"] / session_stats["total"] * 100).round(1)
session_stats = session_stats[["TP1", "SL", "total", "winrate"]].reset_index()

global_stats = pd.DataFrame({
    "Metric": [
        "Total Trades", "TP1", "SL", "NONE",
        "Winrate Global", "% Buy", "% Sell",
        "Buy Winrate", "Sell Winrate",
        "SL Size (avg)", "TP1 Size (avg)", "RR TP1 (avg)", "RR TP2 (avg)"
    ],
    "Value": [
        total_trades, tp, sl, none,
        winrate, buy_pct, sell_pct,
        buy_winrate, sell_winrate,
        avg_sl_size, avg_tp1_size, avg_rr_tp1, avg_rr_tp2
    ]
})

# === PAR HEURE TP1
hourly = df_tp1.groupby("hour")["result"].value_counts().unstack(fill_value=0)
hourly["total"] = hourly.sum(axis=1)
hourly["winrate"] = (hourly["TP1"] / hourly["total"] * 100).round(1)
hourly = hourly[["TP1", "SL", "total", "winrate"]].reset_index()

# === JOUR + HEURE TP1
daily_hourly = df_tp1.groupby(["date", "hour"])["result"].value_counts().unstack(fill_value=0)
daily_hourly["total"] = daily_hourly.sum(axis=1)
filtered = daily_hourly[daily_hourly["total"] >= 2]
if filtered.empty:
    filtered = daily_hourly
filtered["winrate"] = (filtered["TP1"] / filtered["total"] * 100).round(1)
daily_hourly = filtered[["TP1", "SL", "total", "winrate"]].reset_index()

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

# === PAR HEURE TP2
hourly_tp2 = df_tp2.groupby("hour")["result"].value_counts().unstack(fill_value=0)
for col in ["TP2", "SL"]:
    if col not in hourly_tp2.columns:
        hourly_tp2[col] = 0
hourly_tp2["total"] = hourly_tp2.sum(axis=1)
hourly_tp2["winrate"] = (hourly_tp2["TP2"] / hourly_tp2["total"] * 100).round(1)
hourly_tp2 = hourly_tp2[["TP2", "SL", "total", "winrate"]].reset_index()

# === EXPORTS ===
global_stats.to_csv(f"{STRATEGY_NAME}_global.csv", index=False)
session_stats.to_csv(f"{STRATEGY_NAME}_sessions.csv", index=False)
hourly.to_csv(f"{STRATEGY_NAME}_par_heure.csv", index=False)
daily_hourly.to_csv(f"{STRATEGY_NAME}_jour_heure.csv", index=False)
tp2_stats.to_csv(f"{STRATEGY_NAME}_tp2_global.csv", index=False)
hourly_tp2.to_csv(f"{STRATEGY_NAME}_tp2_par_heure.csv", index=False)

with pd.ExcelWriter(f"analyse_{STRATEGY_NAME}_resultats.xlsx") as writer:
    global_stats.to_excel(writer, sheet_name="Global", index=False)
    session_stats.to_excel(writer, sheet_name="Sessions", index=False)
    hourly.to_excel(writer, sheet_name="Par_Heure", index=False)
    daily_hourly.to_excel(writer, sheet_name="Jour_Heure", index=False)
    tp2_stats.to_excel(writer, sheet_name="TP2_Global", index=False)
    hourly_tp2.to_excel(writer, sheet_name="Par_Heure_TP2", index=False)

print("✅ Analyse V4.2 avec RR, SL/TP size ajoutés au global.")
