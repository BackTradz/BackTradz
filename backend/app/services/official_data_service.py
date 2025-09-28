"""
File: backend/app/services/official_data_service.py
Role: Helpers pour la librairie 'official' (répertoire & listing).
"""

from pathlib import Path
import os
from app.core.paths import DATA_ROOT

OFFICIAL_DIR = DATA_ROOT / "official"

def list_official_csv_files():
    files = []
    if not OFFICIAL_DIR.exists():
        return files
    for filename in os.listdir(OFFICIAL_DIR):
        if filename.endswith(".csv"):
            filepath = OFFICIAL_DIR / filename
            size_kb = round(filepath.stat().st_size / 1024, 2)
            files.append({
                "filename": filename,
                "size_kb": size_kb,
                "path": str(filepath)
            })
    return files
