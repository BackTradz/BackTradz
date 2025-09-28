"""
File: backend/routes/csv_library_routes.py
Role: Gestion de la librairie CSV (listage + téléchargement).
Depends:
  - backend/data/official/*.csv
  - backend/assets/csv_library/*.csv
  - backend/output/ (CSV générés)
  - backend/models/users (pour décrément crédits + historique)
Side-effects:
  - Téléchargement décrémente crédits + enregistre historique achat.
  - Récupère et expose la structure des fichiers disponibles.
Security:
  - Certaines routes publiques (listage), d’autres protégées par X-API-Key.
"""
from app.core.paths import OUTPUT_DIR, OUTPUT_LIVE_DIR, DATA_ROOT
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import FileResponse
from app.models.users import get_user_by_token, update_user, decrement_credits
from app.utils.data_loader import load_data_or_extract
import json
from app.models.users import USERS_FILE, get_user_by_token

from pathlib import Path
from app.services.csv_library_service import (
    now_iso,
    _ensure_store_dir, _user_identifier,
    _store_extraction_log, _load_recent_extractions,
    _resolve_storage_path_for_download,
)

router = APIRouter()

@router.get("/list_csv_library")
def list_csv_library():
    """
    Liste les CSV dans backend/output.

    Retour:
        list[dict]: [{
          symbol, timeframe, year, month, filename, relative_path
        }, ...]
    """
    root_dir = OUTPUT_DIR
    csv_files = list(root_dir.rglob("*.csv"))

    library = []
    for file in csv_files:
        name = file.stem  # ex: AUDUSD_H4_2025-06
        parts = name.split("_")

        if len(parts) >= 3 and "-" in parts[2]:
            symbol = parts[0]
            timeframe = parts[1]
            year, month = parts[2].split("-")
            relative_path = str(file.resolve().relative_to(OUTPUT_DIR.resolve())).replace("\\", "/")

            library.append({
                "symbol": symbol,
                "timeframe": timeframe,
                "year": year,
                "month": month,
                "filename": file.name,
                "relative_path": relative_path
            })

    return library

@router.get("/list_csv_files")
def list_csv_files():
    """
    Liste les CSV officiels (backend/data/official).

    Retour:
        {
          "pairs": [ "AUDUSD", ...],
          "files_by_pair": { "AUDUSD": [ { timeframe, filename }, ... ] }
        }
    """
    official_dir = OUTPUT_DIR
    csv_files = list(official_dir.glob("*.csv"))

    files_by_pair = {}
    all_pairs = set()

    for file in csv_files:
        name = file.stem  # ex: AUDUSD_m5_2025-06
        parts = name.split("_")
        if len(parts) >= 3:
            symbol = parts[0]
            timeframe = parts[1]
            filename = file.name

            all_pairs.add(symbol)
            files_by_pair.setdefault(symbol, []).append({
                "timeframe": timeframe,
                "filename": filename
            })

    return {
        "pairs": sorted(all_pairs),
        "files_by_pair": files_by_pair
    }

# ⚠️ v1.2 – LEGACY (route publique) DÉPLACÉE HORS PRODUCTION
# Raison :
#   - Cette fonction exposait un téléchargement public en doublon avec
#     la route protégée ci-dessous (même path /download_csv/{filename}).
#   - Pour éviter toute régression de code (imports, références),
#     on la conserve mais sur un chemin interne caché, non documenté.
#   - NE PAS utiliser en prod. L’unique route de téléchargement reste
#     la version PROTÉGÉE plus bas (consommation de crédits).
@router.get("/__legacy_download_csv/{filename}", include_in_schema=False)
def download_csv__legacy_hidden(filename: str):
    """
    [LEGACY – MASQUÉ] Ancienne variante non protégée.
    Gardée pour compat technique, **à ne pas exposer**.
    """
    file_path = OUTPUT_DIR / filename
    if file_path.exists():
        # Réponse neutre : on force une erreur claire pour éviter tout usage involontaire.
        # Comportement choisi : 401 explicite (auth requise) plutôt que de servir le fichier.
        raise HTTPException(status_code=401, detail="Authentification requise (utiliser l’endpoint protégé).")
    raise HTTPException(status_code=404, detail="Fichier introuvable")

@router.get("/list_output_backtest_files")
def list_backtest_csv_from_output():
    """
    Liste des CSV présents dans backend/output, regroupés par symbol/timeframe.

    Retour:
        dict: { "AUDUSD": { "M5": [ {year,month,filename,relative_path}, ... ] } }
    """
    from collections import defaultdict

    root_dir = OUTPUT_DIR
    csv_files = list(root_dir.rglob("*.csv"))

    result = defaultdict(lambda: defaultdict(list))
    for file in csv_files:
        parts = file.stem.split("_")  # ex: AUDUSD_M5_2025-06
        if len(parts) >= 3 and "-" in parts[2]:
            symbol = parts[0]
            timeframe = parts[1]
            year, month = parts[2].split("-")

            result[symbol][timeframe].append({
                "year": year,
                "month": month,
                "filename": file.name,
                "relative_path": str(file).replace("\\", "/")
            })

    return result

@router.get("/download_csv/{filename}")
def download_csv(filename: str, x_api_key: str = Header(None)):
    """
    Télécharge un CSV de la librairie (backend/assets/csv_library).
    Consomme 1 crédit utilisateur et logge l’historique.

    Auth:
        - Header X-API-Key obligatoire.

    Raises:
        - 401 si token invalide
        - 403 si crédits insuffisants
        - 404 si user/fichier introuvable
    """
    from app.models.users import USERS_FILE, get_user_by_token

    # BTZ-PATCH v1.1: chemin centralisé pour assets CSV (sous DATA_ROOT)
    assets_dir = DATA_ROOT / "assets" / "csv_library"
    file_path = assets_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    user = get_user_by_token(x_api_key)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide")

    if user.credits < 1:
        raise HTTPException(status_code=403, detail="Pas assez de crédits")

    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)

        if user.id not in users:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        users[user.id]["credits"] -= 1
        users[user.id].setdefault("purchase_history", []).append({
            "label": "Téléchargement CSV",
            "price_paid": -1,
            "method": "credits",
            "type": "Téléchargement",
            "filename": filename,
            "date": datetime.now().isoformat()
        })

        f.seek(0)
        json.dump(users, f, indent=2)
        f.truncate()

    return FileResponse(file_path, filename=filename, media_type="text/csv")

from fastapi import Query

@router.get("/download_csv_by_path/{path:path}")
def download_csv_by_path(
    path: str,
    x_api_key: str = Header(None),
    token: str = Query(None),   # 👈 Fallback via query
):
    """
    Télécharge un CSV par chemin relatif (backend/…).
    Consomme 1 crédit + log l’historique.

    Auth:
      - Header X-API-Key ou ?token=  (fallback pour liens <a>).
    """
    from app.models.users import USERS_FILE, get_user_by_token

    file_path = Path(path)
    if not file_path.is_absolute():
        # 🔥 patch: force dans OUTPUT_DIR
        file_path = (OUTPUT_DIR / path).resolve()

    # garde-fou (autorise seulement nos dossiers connus)
    allowed_roots = [OUTPUT_DIR.resolve(), OUTPUT_LIVE_DIR.resolve()]
    if not any(r in file_path.parents or file_path == r for r in allowed_roots):
        raise HTTPException(status_code=400, detail="Chemin hors stockage autorisé")


    # 👇 Choix du jeton : header prioritaire, sinon query
    api_key = x_api_key or token
    user = get_user_by_token(api_key)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    # ✅ Résolution robuste du chemin (évite /output/output/)
    file_path, root_used, rel_for_history = _resolve_storage_path_for_download(path)
    if user.credits < 1:
        raise HTTPException(status_code=403, detail="Pas assez de crédits")

    # --- BTZ-PATCH: Historique achat CSV (–1 crédit) complet + normalisé ---
    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        if user.id not in users:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        u = users[user.id]
        u.setdefault("credits", 0)
        u.setdefault("purchase_history", [])

        # ✅ Sécurité: encore une vérif côté serveur
        if int(u["credits"]) < 1:
            raise HTTPException(status_code=403, detail="Pas assez de crédits")

        # 1) Débit
        u["credits"] = int(u["credits"]) - 1

        # 2) Normalisation du chemin pour l’historique (compatible output & output_live)
        try:
            rel_out = str(file_path.resolve().relative_to(OUTPUT_DIR.resolve())).replace("\\", "/")
            prefix = "output"
            rel = rel_out
        except Exception:
            # si ce n'est pas sous OUTPUT_DIR, on essaie OUTPUT_LIVE_DIR
            try:
                rel_live = str(file_path.resolve().relative_to(OUTPUT_LIVE_DIR.resolve())).replace("\\", "/")
                prefix = "output_live"
                rel = rel_live
            except Exception:
                prefix = ""
                rel = ""

        # 3) Entrée d’historique RICHE (utilisée par user + admin)
        entry = {
            "label": "Téléchargement CSV",
            "type": "Téléchargement",
            "method": "credits",
            "price_paid": -1,          # legacy (affichage)
            "credits_delta": -1,       # ✅ clé pour amount = “–1 crédits” dans l’UI
            "filename": file_path.name,
            "date": now_iso(),   
        }
        if rel:
            entry["relative_path"] = rel                          # ex: BTCUSD/M5/2025-06.csv
            entry["path"] = f"backend/{prefix}/{rel}"              # ex: backend/output/... ou backend/output_live/...

        u["purchase_history"].append(entry)

        f.seek(0)
        json.dump(users, f, indent=2, ensure_ascii=False)
        f.truncate()
    # On a déjà un file_path existant via _resolve_storage_path_for_download
    return FileResponse(file_path, filename=file_path.name, media_type="text/csv")



@router.get("/download_owned_csv_by_path/{path:path}")
def download_owned_csv_by_path(
    path: str,
    x_api_key: str = Header(None),
    token: str = Query(None),
):
    """
    Télécharge un CSV déjà acquis par l'utilisateur (0 crédit).
   Autorisé si:
     - présent dans purchase_history (filename ou relative_path),
      - OU présent dans my_recent_extractions (TTL 48h).
    """

    # --- BTZ-PATCH (Mes CSV: support OUTPUT & OUTPUT_LIVE sans régression) ---
    from pathlib import Path as _P

    # Résolution disque
    file_path = Path(path)
    if not file_path.is_absolute():
        file_path = (OUTPUT_DIR / path).resolve()

    allowed_roots = [OUTPUT_DIR.resolve(), OUTPUT_LIVE_DIR.resolve()]
    if not any(r in file_path.parents or file_path == r for r in allowed_roots):
        raise HTTPException(status_code=400, detail="Chemin hors stockage autorisé")

    # Auth
    api_key = x_api_key or token
    user = get_user_by_token(api_key)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide")

    # --- Calcul des deux "relative_path" possibles (output ET output_live) ---
    rel_out = None
    rel_live = None
    try:
        rel_out = str(file_path.resolve().relative_to(OUTPUT_DIR.resolve())).replace("\\","/")
    except Exception:
        pass
    try:
        rel_live = str(file_path.resolve().relative_to(OUTPUT_LIVE_DIR.resolve())).replace("\\","/")
    except Exception:
        pass

    filename = file_path.name

    # --- Vérif "déjà acquis" robuste ---
    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        u = users.get(user.id)
        if not u:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        ph = u.get("purchase_history", [])
        owned = any(
            (r.get("filename") == filename)
            or (rel_out and r.get("relative_path") == rel_out)
            or (rel_live and r.get("relative_path") == rel_live)
            or (rel_out and r.get("path") == f"app/output/{rel_out}")
            or (rel_live and r.get("path") == f"app/output_live/{rel_live}")
            for r in ph
        )

    # ➕ Fallback “extractions récentes” (TTL 48h)
    if not owned:
        rows = _load_recent_extractions(user)
        owned = any(
            (r.get("filename") == filename)
            or (rel_out and (r.get("relative_path") == rel_out or r.get("path") == f"app/output/{rel_out}"))
            or (rel_live and (r.get("relative_path") == rel_live or r.get("path") == f"app/output_live/{rel_live}"))
            for r in rows
        )
        if not owned:
            raise HTTPException(status_code=403, detail="Non autorisé (fichier non acquis)")

    # Historique (trace non débitée)
    with open(USERS_FILE, "r+", encoding="utf-8") as f:
        users = json.load(f)
        users[user.id].setdefault("purchase_history", []).append({
            "label": "Téléchargement (déjà acquis)",
            "price_paid": 0,
            "method": "none",
            "type": "Téléchargement",
            "filename": filename,
            "relative_path": (rel_out or rel_live or ""),
            "date": now_iso(),   
        })
        f.seek(0); json.dump(users, f, indent=2); f.truncate()

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return FileResponse(file_path, filename=filename, media_type="text/csv")
    # --- /BTZ-PATCH ---

# --- AJOUT --- (à la fin du fichier)
from fastapi import Query
@router.get("/extract_to_output_live")
def extract_to_output_live(
    symbol: str = Query(..., min_length=3),
    timeframe: str = Query(..., min_length=1),
    start_date: str = Query(...),  # "YYYY-MM-DD"
    end_date: str = Query(...),    # "YYYY-MM-DD"
    x_api_key: str = Header(None)
):
    """
    Déclenche l'extraction/chargement pour une période donnée.
    ➜ Les fichiers live sont stockés dans:
        backend/output_live/{SYMBOL}/{TF}/SYMBOL_TF_YYYYMMDD_to_YYYYMMDD.csv

    Retourne une liste `files` que le front peut afficher
    dans le bloc "Votre extraction (non listée)".
    """
    user = get_user_by_token(x_api_key)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide")

    from app.utils.data_loader import load_data_or_extract
    try:
        df = load_data_or_extract(symbol, timeframe, start_date, end_date)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Aucune donnée extraite")

        # --- BTZ-PATCH: chercher dans BTCUSD ET BTC-USD + renvoyer relative_path & path ---
        from datetime import datetime as _dt

        def _yyyymmdd(s: str) -> int:
            try:
                return int(s)
            except Exception:
                return 0

        def _parse_range_from_name(name_upper: str):
            # Ex: "BTC-USD_M30_20250901_to_20250915"
            try:
                base = name_upper.split(".")[0]
                part = base.rsplit("_TO_", 1)
                if len(part) != 2:
                    return (0, 0)
                start_str = ''.join(ch for ch in part[0] if ch.isdigit())[-8:]
                end_str   = ''.join(ch for ch in part[1] if ch.isdigit())[-8:]
                return (_yyyymmdd(start_str), _yyyymmdd(end_str))
            except Exception:
                return (0, 0)

        sym = symbol.upper()
        tf  = timeframe.upper()
        sym_no_dash  = sym.replace("-", "")
        req_start_i  = int(start_date.replace("-", ""))
        req_end_i    = int(end_date.replace("-", ""))

        # 🔎 Cherche dans les deux dossiers possibles (avec et sans tiret)
        candidate_dirs = [
            (OUTPUT_LIVE_DIR / sym_no_dash / tf),
            (OUTPUT_LIVE_DIR / sym / tf),
        ]

        offers = []
        for base_dir in candidate_dirs:
            if not base_dir.exists():
                continue
            # 🔎 Motifs avec et sans tiret (selon comment le writer a nommé)
            patterns = [
                f"{sym_no_dash}_{tf}_*.*",
                f"{sym}_{tf}_*.*",
            ]
            for pat in patterns:
                for f in base_dir.glob(pat):
                    nameU = f.stem.upper()
                    f_start_i, f_end_i = _parse_range_from_name(nameU)
                    # 🟢 recouvrement de période
                    if f_start_i and f_end_i and not (f_end_i < req_start_i or f_start_i > req_end_i):
                        rel_under_live = str(
                            f.resolve().relative_to(OUTPUT_LIVE_DIR.resolve())
                        ).replace("\\", "/")
                        rel_path = f"output_live/{rel_under_live}"

                        offers.append({
                            "symbol": sym,
                            "timeframe": tf,
                            "year": start_date[:4],
                            "month": start_date[5:7],
                            "filename": f.name,
                            "relative_path": rel_path,   # consommé par le front
                            "path": rel_path,            # compat autres variantes du front
                            "source": "live",
                            "start_date": start_date,
                            "end_date": end_date,
                        })
                        break
                if offers:
                    break
            if offers:
                break
        # --- /BTZ-PATCH ---


        # Log des extractions (Niv.2) — une entrée par fichier proposé
        for off in offers:
            _store_extraction_log(user, {
                "symbol": off["symbol"],
                "timeframe": off["timeframe"],
                "start_date": start_date,
                "end_date": end_date,
                "relative_path": off["relative_path"],
                "filename": off.get("filename"),
                "source": "live"
            })

        return {
            "status": "ok",
            "rows": int(df.shape[0]),
            "files": offers
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my_recent_extractions")
def my_recent_extractions(x_api_key: str = Header(None)):
    """
    Renvoie jusqu'à 10 extractions récentes (TTL 48h) POUR L'UTILISATEUR COURANT.
    Chaque entrée contient : symbol, timeframe, start_date, end_date, relative_path,
    filename (si dispo), created_at.
    """
    user = get_user_by_token(x_api_key)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide")

    rows = _load_recent_extractions(user)

    # Normalisation front-friendly
    out = []
    backend_root = Path("app").resolve()
    for r in rows:
        rel = r.get("relative_path") or r.get("path") or ""
        name = r.get("filename") or Path(rel).name
        # derive year-month depuis start_date (fallback)
        start = r.get("start_date", "")
        year = start[:4] if len(start) >= 7 else ""
        month = start[5:7] if len(start) >= 7 else ""
        out.append({
            "symbol": r.get("symbol", "").upper(),
            "timeframe": r.get("timeframe", "").upper(),
            "start_date": start,
            "end_date": r.get("end_date", ""),
            "relative_path": rel,
            "filename": name,
            "year": year,
            "month": month,
            "source": "live",
            "created_at": r.get("created_at", "")
        })
    return {"files": out}
