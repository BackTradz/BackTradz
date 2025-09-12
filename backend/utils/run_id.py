# backend/utils/run_id.py
import hashlib
import json
from typing import Any, Dict

# [BTZ] Sérialisation JSON canonique, stable et compacte (clé triées)
def _json_canonical(data: Any) -> str:
    """
    Retourne une représentation JSON stable (tri des clés, pas d'espaces),
    pour garantir que le même ensemble de paramètres produit le même hash.
    """
    return json.dumps(
        data,
        ensure_ascii=False,      # garde les caractères lisibles
        sort_keys=True,          # TRI DES CLES = stabilité
        separators=(",", ":"),   # JSON compact (pas d'espaces)
        default=lambda o: repr(o)
    )

# [BTZ] Normalisation des params pour éviter les surprises (str/int/float/bool)
def _normalize_params(params: Dict[str, Any] | None) -> Dict[str, Any]:
    """
    Nettoie/normalise les paramètres pour hashing :
    - convertit les objets non-JSON (ex: numpy types) en str via repr
    - supprime les clés None pour éviter des hash différents sans effet réel
    """
    if not params:
        return {}
    norm = {}
    for k, v in params.items():
        if v is None:
            continue
        # cast simple pour stabilité
        if isinstance(v, (str, int, float, bool)):
            norm[k] = v
        else:
            norm[k] = repr(v)  # fallback stable
    return norm

# [BTZ] Construit un run_id (hash court) à partir de tous les inputs
def make_run_id(
    *,
    strategy_name: str,
    symbol: str,
    timeframe: str,
    period: str,
    sl_pips: int | float,
    tp1_pips: int | float,
    tp2_pips: int | float,
    params: Dict[str, Any] | None,
    user_id: str | None
) -> str:
    """
    Calcule un SHA1 tronqué (10 chars) sur un payload canonique
    incluant tous les éléments qui définissent un run.
    """
    payload = {
        "strategy_name": strategy_name,
        "symbol": symbol,
        "timeframe": timeframe,
        "period": period,
        "sl_pips": sl_pips,
        "tp1_pips": tp1_pips,
        "tp2_pips": tp2_pips,
        "params": _normalize_params(params),
        "user_id": user_id or "",  # inclure user_id -> évite collisions cross-users
    }
    raw = _json_canonical(payload).encode("utf-8")
    return hashlib.sha1(raw).hexdigest()[:10]  # court mais suffisant
