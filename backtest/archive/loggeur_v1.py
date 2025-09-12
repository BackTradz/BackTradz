#===V1

import os
import json
from datetime import datetime
from typing import Optional

def log_params_to_file(strategy: str,
                       pair: str,
                       timeframe: str,
                       period: str,
                       params: dict,
                       output_dir: str = "logs",
                       note: Optional[str] = None):
    """
    Logger universel : crée un .txt et un .json avec tous les paramètres du test, qu'ils soient présents ou non.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")

    filename_base = f"{strategy}_{pair}_{timeframe}_{period.replace(' ', '_')}_{timestamp}"

    # Construction du contenu texte
    txt_content = f"""=== BACKTEST LOG ===
DATE : {timestamp}

STRATEGIE : {strategy}
PAIRE : {pair}
TIMEFRAME : {timeframe}
PERIODE : {period}

PARAMETRES :
"""
    for k, v in params.items():
        txt_content += f"- {k} : {v}\n"

    txt_content += f"\nNOTE :\n{note or '—'}"

    with open(os.path.join(output_dir, filename_base + ".txt"), "w", encoding="utf-8") as f_txt:
        f_txt.write(txt_content)

    # JSON
    json_content = {
        "date": timestamp,
        "strategy": strategy,
        "pair": pair,
        "timeframe": timeframe,
        "period": period,
        "params": params,
        "note": note or ""
    }

    with open(os.path.join(output_dir, filename_base + ".json"), "w", encoding="utf-8") as f_json:
        json.dump(json_content, f_json, indent=4)

    print(f"Log généré : {filename_base}.txt / .json dans {output_dir}/")

