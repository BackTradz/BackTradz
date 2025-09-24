# backend/utils/logger.py

import logging
import os
import json
import re
from datetime import datetime
from typing import Optional, Mapping, Any
from app.core.paths import DATA_ROOT


# BTZ-PATCH v1.1: logs sous DATA_ROOT/logs (local/prod unifié)
LOG_DIR = DATA_ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Nom du fichier = stratify_YYYY-MM-DD.log
log_filename = LOG_DIR / f"BackTradz_{datetime.now().strftime('%Y-%m-%d')}.log"

# === Création du logger global
logger = logging.getLogger("BackTradz")
logger.setLevel(logging.DEBUG)  # Par défaut : tout capter, on filtre dans les handlers

# === Formatage
formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", "%H:%M:%S")

# === Handler fichier
file_handler = logging.FileHandler(log_filename, encoding='utf-8')
file_handler.setLevel(logging.DEBUG)  # DEBUG en fichier
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# === Handler console
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)  # Moins verbeux en console
#console_handler.setLevel(logging.DEBUG)   # 🔁 tu peux changer par INFO, WARNING, ERROR...
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# === Exemple d'utilisation (à supprimer ensuite)
# logger.debug("Message de debug")
# logger.info("Info visible")
# logger.warning("Attention !")
# logger.error("Erreur critique")

# utils/logger.py (ou l'emplacement actuel de ta fonction)

def _slug(s: str | None) -> str:
    """Sanitize pour des noms de fichiers propres."""
    if not s:
        return "na"
    s = s.strip()
    s = re.sub(r"[^A-Za-z0-9._-]+", "-", s)
    return (s or "na")[:64]

def log_params_to_file(
    strategy_name: str | None = None,
    symbol: str | None = None,
    timeframe: str | None = None,
    params: dict | None = None,
    # 👉 nouveau: pour logguer DANS le même dossier que le .xlsx
    output_dir: str | None = None,
    # 👉 optionnels utiles (si jamais tu les passes un jour)
    start_date: str | None = None,
    end_date: str | None = None,
    user_id: str | int | None = None,
    # 👉 rétro-compat: accepte aussi 'strategy=' sans casser les anciens appels
    strategy: str | None = None,
    **kwargs,  # on swallow tout le reste si un appel ajoute un named-arg de + (zéro crash)
):
    """
    Sauvegarde les paramètres d’un backtest dans un fichier de log ET en JSON.
    - Si output_dir est fourni → écrit DANS ce dossier (aux côtés de la .xlsx)
    - Sinon → fallback vers ./logs (comportement historique)
    - Accepte 'strategy=' comme alias de 'strategy_name' (fixe l'erreur).
    """
    name = strategy_name or strategy or "unknown_strategy"
    sym  = symbol or "UNKNOWN"
    tf   = timeframe or "NA"
    p    = params or {}

    # Dossier cible: output_dir (préféré) sinon ./logs
    log_dir = output_dir or "logs"
    os.makedirs(log_dir, exist_ok=True)

    # Fichiers cibles (texte append + JSON propre)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    base = f"params_{_slug(name)}_{_slug(sym)}_{_slug(tf)}"
    txt_path  = os.path.join(log_dir, f"{base}.txt")
    json_path = os.path.join(log_dir, "params.json")  # stable pour réutilisation

    # 1) Log texte (append, comme avant)
    with open(txt_path, "a", encoding="utf-8") as f:
        f.write(f"--- {ts} ---\n")
        # on ajoute aussi des métadonnées utiles en tête
        f.write(f"strategy = {name}\n")
        f.write(f"symbol   = {sym}\n")
        f.write(f"timeframe= {tf}\n")
        if start_date: f.write(f"start    = {start_date}\n")
        if end_date:   f.write(f"end      = {end_date}\n")
        if user_id is not None: f.write(f"user_id  = {user_id}\n")
        for k, v in p.items():
            f.write(f"{k} = {v}\n")
        f.write("\n")

    # 2) JSON (overwrite à chaque run pour usage programmatique)
    payload = {
        "timestamp": ts,
        "strategy": name,
        "symbol": sym,
        "timeframe": tf,
        "start_date": start_date,
        "end_date": end_date,
        "user_id": user_id,
        "params": p,
    }
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(payload, jf, ensure_ascii=False, indent=2)

    return {"txt": txt_path, "json": json_path}
