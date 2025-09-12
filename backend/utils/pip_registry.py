# backend/utils/pip_registry.py
"""
Source de vérité 'pip' BackTradz, sans régression.
- get_pip(symbol) renvoie un float ou None
- Fallbacks robustes si la paire n'est pas dans la table:
  * Forex JPY -> 0.01
  * Forex non-JPY -> 0.0001
  * XAUUSD -> 0.1
  * Crypto BTC-USD -> 1 ; ETH-USD -> 0.01 ; sinon crypto USD -> 0.01
  * Indices (^...) -> 1
  * Futures énergie/métaux selon mapping
"""

from __future__ import annotations
from typing import Optional
from functools import lru_cache

PAIR_PIPS = {
    # --- Métaux / énergie / agri ---
    "GC=F": 0.1, "XAUUSD": 0.1, "SI=F": 0.01, "PL=F": 0.1, "HG=F": 0.0005,
    "CL=F": 0.01, "BZ=F": 0.01, "ZC=F": 0.25,

    # --- Indices (points) ---
    "^AXJO": 1, "^BSESN": 1, "^BVSP": 1, "^DJI": 1, "^FCHI": 1, "^FTSE": 1,
    "^GDAXI": 1, "^GSPC": 1, "^HSI": 1, "^IXIC": 1, "^N225": 1, "^STOXX50E": 1,

    # --- Contexte (non-exécutés mais utiles) ---
    "^TNX": 0.01, "^VIX": 0.1,

    # --- Crypto ---
    "BTC-USD": 1, "ETH-USD": 0.01,

    # --- Forex majeures & crosses ---
    "EURUSD": 0.0001, "GBPUSD": 0.0001, "AUDUSD": 0.0001, "NZDUSD": 0.0001,
    "USDCHF": 0.0001, "USDCAD": 0.0001, "USDSEK": 0.0001, "USDNOK": 0.0001,
    "USDSGD": 0.0001, "USDPLN": 0.0001, "USDILS": 0.0001, "USDHKD": 0.0001,
    "USDHUF": 0.01, "USDMXN": 0.0001, "USDZAR": 0.0001, "USDTRY": 0.0001,
    "USDKRW": 0.01,

    # JPY pairs
    "USDJPY": 0.01, "EURJPY": 0.01, "GBPJPY": 0.01, "AUDJPY": 0.01,
    "NZDJPY": 0.01, "CHFJPY": 0.01,

    # Alias possibles (si ton front envoie des slashes)
    "CHF/JPY": 0.01,
}

def _is_index(sym: str) -> bool:
    return sym.startswith("^")

def _is_crypto(sym: str) -> bool:
    return sym.endswith("-USD") and sym.split("-")[0].isalpha() and len(sym.split("-")[0]) in (3, 4)

def _is_fx(sym: str) -> bool:
    # Symbole FX sans séparateur: EURUSD, GBPJPY...
    return len(sym) in (6, 7) and sym.isalpha()

def _is_fx_jpy(sym: str) -> bool:
    return _is_fx(sym) and sym.endswith("JPY")
@lru_cache(maxsize=512)
def get_pip(symbol: str) -> Optional[float]:
    """Retourne le pip 'BackTradz' pour un symbole, avec fallbacks safe."""
    if not symbol:
        return None
    sym = symbol.strip().upper()
    # alias “EUR/JPY” → “EURJPY”
    if "/" in sym and len(sym.replace("/", "")) in (6, 7):
        sym = sym.replace("/", "")

    # 1) mapping direct
    if sym in PAIR_PIPS:
        return PAIR_PIPS[sym]

    # 2) Règles fallback (0 régression: garde tes valeurs actuelles par défaut)
    if _is_index(sym):
        return 1.0

    if _is_fx(sym):
        return 0.01 if _is_fx_jpy(sym) else 1e-4

    if sym == "XAUUSD":
        return 0.1

    if _is_crypto(sym):
        # BTC-USD déjà mappé. Par défaut: crypto fine = 0.01
        base = sym.split("-")[0]
        if base == "BTC":
            return 1.0
        if base == "ETH":
            return 0.01
        return 0.01

    # Futures non mappés explicitement → prudence: None
    return None
