from backend.analyseur import analyze_file
from pathlib import Path

def run_analysis(csv_path: str, strategy_name: str, symbol: str, sl_pips: int, period: str) -> str:
    """
    Lance une analyse complète sur un CSV (résultats de backtest) et génère un fichier Excel.

    Args:
        csv_path (str): chemin vers le CSV à analyser.
        strategy_name (str): nom de la stratégie utilisée.
        symbol (str): le symbole de trading (ex: 'XAU', 'EURUSD').
        sl_pips (int): taille du stop loss utilisée (pips).
        period (str): période du backtest (souvent format "01-06,30-06-25").

    Returns:
        str: chemin du fichier Excel généré (ou None en cas d'erreur).
    """
    try:
        export_dir = Path(csv_path).parent  # répertoire du fichier CSV
        # 🔎 Appelle la fonction principale d’analyse définie dans backend/analyseur.py
        analyze_file(csv_path, export_dir, strategy_name, symbol, sl_pips, period)

        # 📄 Nom standardisé du fichier de sortie Excel
        filename = f"analyse_{strategy_name}_{symbol}_SL{sl_pips}_{period}_resultats.xlsx"
        return str(export_dir / filename)
    except Exception as e:
        print("❌ Erreur dans run_analysis :", e)
        return None
