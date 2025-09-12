
import pandas as pd

# === Chargement automatique du fichier CSV généré par le runner ===
FILENAME = "backtest_results.csv"

try:
    df = pd.read_csv(FILENAME)
except FileNotFoundError:
    print(f"❌ Fichier {FILENAME} introuvable. Place-le dans le même dossier que ce script.")
    exit()

# === Nettoyage et extraction de l'heure ===
df["time"] = pd.to_datetime(df["time"], errors="coerce")
df = df.dropna(subset=["time"])  # on garde que les lignes valides
df["hour"] = df["time"].dt.hour

# === Statistiques globales ===
total_trades = len(df)
tp1_count = (df["result"] == "TP1").sum()
sl_count = (df["result"] == "SL").sum()
none_count = (df["result"] == "NONE").sum()
winrate = round((tp1_count / (tp1_count + sl_count)) * 100, 2) if (tp1_count + sl_count) > 0 else 0

start_time = df["time"].min().strftime("%Y-%m-%d %H:%M")
end_time = df["time"].max().strftime("%Y-%m-%d %H:%M")

# === Statistiques horaires ===
hourly_stats = df.groupby("hour")["result"].value_counts().unstack(fill_value=0)
hourly_stats["total"] = hourly_stats.sum(axis=1)
hourly_stats["winrate"] = (hourly_stats.get("TP1", 0) / hourly_stats["total"] * 100).round(1)
hourly_stats = hourly_stats[["TP1", "SL", "total", "winrate"]].sort_index()

# === Affichage Console ===
print("\nAnalyse des résultats du backtest")
print("----------------------------------")
print(f"Période couverte  : {start_time} → {end_time}")
print(f"Total trades      : {total_trades}")
print(f"TP1               : {tp1_count}")
print(f"SL                : {sl_count}")
print(f"NONE              : {none_count}")
print(f"Winrate global    : {winrate}%")
print("\nWinrate par heure :")
print(hourly_stats.to_string())
