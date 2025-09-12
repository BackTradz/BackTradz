###====v3
import pandas as pd

FILENAME = "backtest_results.csv"
CSV_HEURE = "stats_par_heure.csv"
CSV_JOUR_HEURE = "stats_par_jour_heure.csv"

try:
    df = pd.read_csv(FILENAME)
except FileNotFoundError:
    print(f"❌ Fichier {FILENAME} introuvable. Place-le dans le même dossier que ce script.")
    exit()

# Préparation
df["time"] = pd.to_datetime(df["time"], errors="coerce")
df = df.dropna(subset=["time"])
df["hour"] = df["time"].dt.hour
df["date"] = df["time"].dt.date

# === Stats globales heure ===
hourly = df.groupby("hour")["result"].value_counts().unstack(fill_value=0)
hourly["total"] = hourly.sum(axis=1)
hourly["winrate"] = (hourly.get("TP1", 0) / hourly["total"] * 100).round(1)
hourly = hourly[["TP1", "SL", "total", "winrate"]].reset_index()

# === Stats par jour + heure ===
daily_hourly = df.groupby(["date", "hour"])["result"].value_counts().unstack(fill_value=0)
daily_hourly["total"] = daily_hourly.sum(axis=1)
daily_hourly["winrate"] = (daily_hourly.get("TP1", 0) / daily_hourly["total"] * 100).round(1)
daily_hourly = daily_hourly[["TP1", "SL", "total", "winrate"]].reset_index()

# === Analyse console ===
print("\n📊 Résumé Analyseur V3 REWORK")
print("----------------------------------")
print(f"Total trades      : {len(df)}")
tp = (df["result"] == "TP1").sum()
sl = (df["result"] == "SL").sum()
none = (df["result"] == "NONE").sum()
global_wr = round((tp / (tp + sl)) * 100, 2) if (tp + sl) > 0 else 0
print(f"TP1               : {tp}")
print(f"SL                : {sl}")
print(f"NONE              : {none}")
print(f"Winrate global    : {global_wr}%")

# === Top 3 heures winrate ===
print("\n🟢 Top 3 Heures Winrate")
top_hours = hourly[hourly["total"] >= 3].sort_values("winrate", ascending=False).head(3)
print(top_hours[["hour", "total", "winrate"]].to_string(index=False))

# === Pire 3 heures (SL) ===
print("\n🔴 Heures avec le plus de SL")
worst_hours = hourly.sort_values("SL", ascending=False).head(3)
print(worst_hours[["hour", "SL", "winrate"]].to_string(index=False))

# === Jours les plus actifs ===
print("\n📅 Top 3 Jours les plus tradés")
top_days = df.groupby("date").size().sort_values(ascending=False).head(3)
print(top_days.to_string())

# === Export CSV ===
hourly.to_csv(CSV_HEURE, index=False)
daily_hourly.to_csv(CSV_JOUR_HEURE, index=False)
print(f"\n✅ Export CSV : {CSV_HEURE} & {CSV_JOUR_HEURE}")
