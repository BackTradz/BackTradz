"""
File: backend/app/services/paypal_service.py
Role: Constantes & helper d'auth PayPal (OAuth token).
"""

import os
import requests

PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")

def get_paypal_access_token():
    """
    Récupère un access_token OAuth PayPal via client_id + secret.
    """
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/oauth2/token",
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        headers={"Accept": "application/json"},
        data={"grant_type": "client_credentials"}
    )
    response.raise_for_status()
    return response.json()["access_token"]
