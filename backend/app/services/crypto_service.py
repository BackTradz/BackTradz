"""
File: backend/app/services/crypto_service.py
Role: Helpers et constantes pour les paiements crypto (NowPayments).
Security: La protection reste côté routes (auth, tokens). Ici: utilitaires purs.
"""

import hmac
import hashlib

# Base API NowPayments (constante centralisée)
NOWPAYMENTS_API_BASE = "https://api.nowpayments.io/v1"

def verify_nowpayments_signature(raw_body: bytes, signature: str, ipn_secret: str) -> bool:
    """
    Vérifie la signature HMAC (NOWPayments IPN) avec l'IPN_SECRET (pas la clé API).
    - raw_body: contenu brut de la requête (bytes)
    - signature: header 'x-nowpayments-sig'
    - ipn_secret: secret IPN configuré dans ton .env / dashboard NowPayments
    """
    if not ipn_secret or not signature:
        return False
    computed_sig = hmac.new(ipn_secret.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed_sig, signature)
