###===V2


import pandas as pd
import os
import glob
import matplotlib.pyplot as plt
import seaborn as sns

input_folder = "run"
os.makedirs("comparateur_output", exist_ok=True)

# === COMPARATIF GLOBAL ===
summary = []
global_files = glob.glob(os.path.join(input_folder, "*_global.csv"))

for file_path in global_files:
    df = pd.read_csv(file_path)
    strat_name = os.path.basename(file_path).replace("_global.csv", "")
    total = None
    winrate = None

    if "Metric" in df.columns and "Value" in df.columns:
        if "Total Trades" in df["Metric"].values:
            total = pd.to_numeric(df[df["Metric"] == "Total Trades"]["Value"].values[0], errors="coerce")
        winrate_row = df[df["Metric"].str.lower().str.contains("winrate")]
        if not winrate_row.empty:
            winrate = pd.to_numeric(winrate_row["Value"].values[0], errors="coerce")

    if winrate is not None:
        summary.append({
            "Stratégie": strat_name,
            "Total Trades": total,
            "Winrate": winrate
        })

summary_df = pd.DataFrame(summary).dropna(subset=["Winrate"]).sort_values("Winrate", ascending=False)
summary_df.to_csv("comparateur_output/global_comparatif.csv", index=False)

# === GRAPHIQUE GLOBAL ===
plt.figure(figsize=(10, 4))
sns.barplot(x="Stratégie", y="Winrate", data=summary_df, palette="crest")
plt.title("Winrate global par stratégie")
plt.ylabel("Winrate (%)")
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig("comparateur_output/global_comparatif_barplot.png")
plt.close()

# === PAR HEURE COMPARATIF ===
par_heure_files = glob.glob(os.path.join(input_folder, "*_par_heure.csv"))
merged_par_heure = pd.DataFrame()

for file_path in par_heure_files:
    strat = os.path.basename(file_path).replace("_par_heure.csv", "")
    df = pd.read_csv(file_path)
    df["stratégie"] = strat
    merged_par_heure = pd.concat([merged_par_heure, df], ignore_index=True)

if not merged_par_heure.empty:
    pivot_par_heure = merged_par_heure.pivot(index="hour", columns="stratégie", values="winrate")
    pivot_par_heure.to_csv("comparateur_output/par_heure_comparatif.csv")

    # HEATMAP PAR HEURE
    plt.figure(figsize=(12, 4))
    sns.heatmap(pivot_par_heure, annot=True, fmt=".1f", cmap="YlGnBu")
    plt.title("Comparatif Winrate par Heure")
    plt.ylabel("Heure")
    plt.tight_layout()
    plt.savefig("comparateur_output/par_heure_heatmap.png")
    plt.close()

# === TP2 COMPARATIF ===
tp2_files = glob.glob(os.path.join(input_folder, "*_tp2_global.csv"))
tp2_data = []

for file_path in tp2_files:
    strat = os.path.basename(file_path).replace("_tp2_global.csv", "")
    df = pd.read_csv(file_path)

    winrate_row = df[df["Metric"].str.contains("Winrate", case=False)]
    winrate = pd.to_numeric(winrate_row["Value"].values[0], errors="coerce") if not winrate_row.empty else None

    if winrate is not None:
        tp2_data.append({"Stratégie": strat, "TP2 Winrate": winrate})

df_tp2_summary = pd.DataFrame(tp2_data)
df_tp2_summary.to_csv("comparateur_output/tp2_comparatif.csv", index=False)

# BARPLOT TP2
if not df_tp2_summary.empty:
    plt.figure(figsize=(10, 4))
    sns.barplot(x="Stratégie", y="TP2 Winrate", data=df_tp2_summary, palette="flare")
    plt.title("TP2 Winrate par stratégie")
    plt.ylabel("Winrate (%)")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig("comparateur_output/tp2_barplot.png")
    plt.close()

print("✅ Comparateur V2 généré avec : résumé CSV + barplots + heatmaps.")
