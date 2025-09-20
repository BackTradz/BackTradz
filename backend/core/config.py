import os
from os import getenv


def _first_url(env_value: str, default: str) -> str:
    """
    Prend la première URL valable d'une chaîne possiblement séparée par
    des virgules/espaces/retours ligne. Ex:
      "https://www.backtradz.com, https://backtradz.com\n"
    -> "https://www.backtradz.com"
    """
    raw = (env_value or "").strip()
    if not raw:
        return default.rstrip("/")
    # Unifie séparateurs: remplace retours ligne par virgules
    raw = raw.replace("\r", "\n").replace("\n", ",")
    # Split sur virgule ET espaces
    parts = []
    for chunk in raw.split(","):
        for p in chunk.split():
            if p.strip():
                parts.append(p.strip())
    url = parts[0] if parts else default
    return url.rstrip("/")

FRONTEND_URL = _first_url(
    os.getenv("FRONTEND_URL"),
    "https://www.backtradz.com",
)

PUBLIC_API_URL = _first_url(
    os.getenv("PUBLIC_API_URL"),
    "https://api.backtradz.com",
)

# === NOWPayments ===
NOWPAYMENTS_API_KEY   = os.getenv("NOWPAYMENTS_API_KEY", "").strip()
NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET", "").strip()
