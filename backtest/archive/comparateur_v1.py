###===V1


import pandas as pd
import os
import glob
import matplotlib.pyplot as plt
import seaborn as sns

# === CONFIGURATION ===
input_folder = "run"  # Dossier contenant les fichiers *_global.csv

summary = []
global_files = glob.glob(os.path.join(input_folder, "*_global.csv"))

# Extraction des stats
for file_path in global_files:
    df = pd.read_csv(file_path)
    strat_name = os.path.basename(file_path).replace("_global.csv", "")

    total = None
    winrate = None

    try:
        if "Metric" in df.columns and "Value" in df.columns:
            if "Total Trades" in df["Metric"].values:
                total = pd.to_numeric(df[df["Metric"] == "Total Trades"]["Value"].values[0], errors="coerce")

            winrate_row = df[df["Metric"].str.lower().str.contains("winrate")]
            if not winrate_row.empty:
                winrate = pd.to_numeric(winrate_row["Value"].values[0], errors="coerce")

        summary.append({
            "Stratégie": strat_name,
            "Total Trades": total,
            "Winrate": winrate
        })

    except Exception as e:
        summary.append({
            "Stratégie": strat_name,
            "Total Trades": None,
            "Winrate": None
        })

# === AFFICHAGE COMPARATIF ===
summary_df = pd.DataFrame(summary).dropna(subset=["Winrate"])
summary_df = summary_df.sort_values("Winrate", ascending=False)

print("\nComparateur – Résumé des Winrates")
print(summary_df)

# === HEATMAP ===
plt.figure(figsize=(10, 1.5))
sns.heatmap([summary_df["Winrate"].values],
            annot=True, fmt=".1f", cmap="YlGnBu", xticklabels=summary_df["Stratégie"])
plt.title("Heatmap des Winrates")
plt.yticks([])

plt.tight_layout()
plt.savefig("comparateur_winrate_heatmap.png")
plt.close()

print("\n✅ Heatmap sauvegardée → comparateur_winrate_heatmap.png")
