# backend/script/top_strategie_generator.py
# =========================================
# 📌 Script utilitaire qui génère un fichier JSON "top_strategies.json"
# à partir des statistiques d’API (/api/admin/stats/backtest_summary).
#
# Fonctionnement :
# 1. Appelle l’API d’admin pour récupérer toutes les stats de backtests
# 2. Trie les stratégies par leur winrate TP1
# 3. Sélectionne les 3 meilleures
# 4. Sauvegarde le résultat dans backend/data/public/top_strategies.json
#
# 💡 Ce fichier JSON est ensuite lu par la route publique
#     → GET /api/public/top_strategies
# pour être affiché sur le site.
#
# ⚠️ Attention : la clé API est codée en dur pour l’instant,
# il faudra la déplacer dans le .env ou une config sécurisée.

import requests
import json
from pathlib import Path


def generate_top_strategies():
    """
    Récupère les stats de backtests via l'API admin
    puis enregistre un fichier JSON contenant le TOP 3 des stratégies
    selon leur winrate TP1.
    """
    url = "https://www.backtradz.com/api/admin/stats/backtest_summary"
    headers = {"X-API-Key": "florian-token"}  # ⚠️ Clé codée en dur (à externaliser)

    try:
        # 🔎 Appel API pour récupérer toutes les stats
        response = requests.get(url, headers=headers)
        data = response.json()
    except Exception as e:
        print("❌ Erreur lors de l'appel API :", e)
        return

    # 📊 Trie les stratégies par winrate TP1 et prend les 3 meilleures
    top = sorted(data, key=lambda x: x["winrate_tp1"], reverse=True)[:3]

    # 📝 Structure du JSON de sortie
    output = [
        {
            "name": item["strategy"],
            "winrate": item["winrate_tp1"],
            "symbol": item["symbol"],
            "timeframe": item["timeframe"],
            "period": item["period"]
        }
        for item in top
    ]

    # 📂 Sauvegarde du fichier JSON dans backend/data/public/top_strategies.json
    BASE_DIR = Path(__file__).resolve().parent.parent  # → dossier backend/
    output_path = BASE_DIR / "data" / "public" / "top_strategies.json"

    # Crée le dossier si inexistant
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Écrit le JSON final
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print("✅ top_strategies.json mis à jour depuis l'API")


# 🏃‍♂️ Lancement direct si exécuté en script
if __name__ == "__main__":
    generate_top_strategies()
