from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import pandas as pd

router = APIRouter()

@router.get("/api/top-strategy")
def get_top_strategies():
    base_path = Path("backend/data/analysis")
    results = []

    for file in base_path.rglob("*.xlsx"):
        try:
            # Lis uniquement les feuilles utiles
            df_global = pd.read_excel(file, sheet_name="Global")
            df_config = pd.read_excel(file, sheet_name="Config")

            # -- Winrate Global
            winrate = df_global.loc[
                df_global["Metric"].astype(str).str.contains("Winrate Global", case=False, na=False),
                "Value"
            ].iloc[0]
            winrate = float(winrate)

            # -- Meta depuis Config
            get_cfg = lambda key: df_config.loc[
                df_config["Paramètre"].astype(str).str.contains(key, case=False, na=False),
                "Valeur"
            ].iloc[0]

            strategy_name = get_cfg("Stratégie")
            pair         = get_cfg("Paire")
            timeframe    = get_cfg("Timeframe")
            period_raw   = get_cfg("Période")  # ex: "2025-06-01 to 2025-06-30"

            # Essaie d'extraire from/to pour le front
            from_date, to_date = None, None
            if isinstance(period_raw, str) and "to" in period_raw:
                left, right = [s.strip() for s in period_raw.split("to", 1)]
                from_date, to_date = left, right

            # -- le "folder" est le nom du dossier parent contenant ce xlsx
            folder = file.parent.name

            results.append({
                "strategy_name": strategy_name,
                "pair": pair,
                "timeframe": timeframe,
                "winrate_tp1": round(winrate, 2),
                "folder": folder,           # <<< indispensable pour l’overlay public
                "period": period_raw,       # ex: "YYYY-MM-DD to YYYY-MM-DD"
                "from_date": from_date,
                "to_date": to_date,
            })
        except Exception:
            # Ignore les xlsx cassés/incomplets
            continue

    # TOP 3 par winrate (desc)
    results.sort(key=lambda x: x["winrate_tp1"], reverse=True)
    top_3 = results[:3]

    if not top_3:
        return JSONResponse(content={"message": "❌ Aucune stratégie disponible pour l’instant."}, status_code=404)

    return top_3



BASE_ANALYSIS = Path("backend/data/analysis")  # <-- ajuste si différent

def _find_xlsx_in_folder(folder: str) -> Path:
    base = BASE_ANALYSIS / folder
    if not base.exists() or not base.is_dir():
        raise HTTPException(status_code=404, detail="Folder not found")
    files = list(base.glob("*.xlsx"))
    if not files:
        raise HTTPException(status_code=404, detail="No xlsx in folder")
    return files[0]  # on prend le premier

@router.get("/api/public/xlsx/meta")
def public_xlsx_meta(folder: str = Query(..., min_length=1)):
    xlsx_path = _find_xlsx_in_folder(folder)
    try:
        xl = pd.ExcelFile(xlsx_path)
        # renvoyer la liste des feuilles (strings simples)
        return {"sheets": xl.sheet_names}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meta error: {e}")

@router.get("/api/public/xlsx/sheet")
def public_xlsx_sheet(
    folder: str = Query(..., min_length=1),
    sheet: str = Query(..., min_length=1),
):
    xlsx_path = _find_xlsx_in_folder(folder)
    try:
        df = pd.read_excel(xlsx_path, sheet_name=sheet)
        headers = list(df.columns)
        rows = df.fillna("").to_dict(orient="records")
        return {"headers": headers, "rows": rows}
    except ValueError:
        raise HTTPException(status_code=404, detail="Sheet not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sheet error: {e}")
