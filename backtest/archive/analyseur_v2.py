
####====V2
import pandas as pd

FILENAME = "backtest_results.csv"
OUTPUT_CSV = "analyse_resultats.csv"

try:
    df = pd.read_csv(FILENAME)
except FileNotFoundError:
    print(f"❌ Fichier {FILENAME} introuvable. Place-le dans le même dossier que ce script.")
    exit()

# Nettoyage de la colonne time
df["time"] = pd.to_datetime(df["time"], errors="coerce")
df = df.dropna(subset=["time"])
df["hour"] = df["time"].dt.hour
df["date"] = df["time"].dt.date

# Stats globales
total_trades = len(df)
tp1_count = (df["result"] == "TP1").sum()
sl_count = (df["result"] == "SL").sum()
none_count = (df["result"] == "NONE").sum()
winrate = round((tp1_count / (tp1_count + sl_count)) * 100, 2) if (tp1_count + sl_count) > 0 else 0
start_time = df["time"].min().strftime("%Y-%m-%d %H:%M")
end_time = df["time"].max().strftime("%Y-%m-%d %H:%M")

# === Analyse par HEURE ===
hourly_stats = df.groupby("hour")["result"].value_counts().unstack(fill_value=0)
hourly_stats["total"] = hourly_stats.sum(axis=1)
hourly_stats["winrate"] = (hourly_stats.get("TP1", 0) / hourly_stats["total"] * 100).round(1)
hourly_stats = hourly_stats[["TP1", "SL", "total", "winrate"]].sort_index()
hourly_stats.index.name = "hour"

# === Analyse par JOUR ===
daily_stats = df.groupby("date")["result"].value_counts().unstack(fill_value=0)
daily_stats["total"] = daily_stats.sum(axis=1)
daily_stats["winrate"] = (daily_stats.get("TP1", 0) / daily_stats["total"] * 100).round(1)
daily_stats = daily_stats[["TP1", "SL", "total", "winrate"]]
daily_stats.index.name = "date"

# Fusion des deux pour archive si besoin
hourly_stats.reset_index(inplace=True)
daily_stats.reset_index(inplace=True)

# Export CSV
with pd.ExcelWriter(OUTPUT_CSV.replace(".csv", ".xlsx")) as writer:
    hourly_stats.to_excel(writer, sheet_name="Par_Heure", index=False)
    daily_stats.to_excel(writer, sheet_name="Par_Jour", index=False)

# Affichage rapide
print("\nAnalyse V2 complète :")
print(f"Période      : {start_time} → {end_time}")
print(f"Total trades : {total_trades} | TP1 : {tp1_count} | SL : {sl_count} | NONE : {none_count}")
print(f"Winrate global : {winrate}%")
print("✅ Export réalisé : analyse_resultats.xlsx")
