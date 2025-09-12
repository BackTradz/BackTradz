# 📁 backend/models/

## 🎯 Rôle du dossier

Ce dossier contient tous les **modèles de données** et structures partagées utilisées dans BackTradz :
- ✅ Offres de paiement (crédits et abonnements)
- ✅ Schémas de réponse de l'API (`Pydantic`)
- ✅ Gestion complète des utilisateurs (fichier `users.json`)

---

## 📄 `offers.py`

> 🎁 Définit les offres de paiement disponibles sur la plateforme.

### Contenu :
- **Offres "one_shot"** (paiement ponctuel pour des crédits) :
  - 5€, 10€, 20€, 50€ avec crédits associés
- **Abonnements mensuels** (recharge automatique de crédits + avantages) :
  - 9€/mois → 10 crédits + priorité + -10%
  - 25€/mois → 30 crédits + priorité + -10%
- Fonction `get_offer_by_id(id)` pour récupérer dynamiquement une offre.

### Utilisation :
- Affichage dans la page pricing
- Traitement des paiements (Stripe / PayPal / Crypto)
- Mise à jour automatique des users (`update_user_after_payment`)

---

## 📄 `response_model.py`

> 📦 Fichier prévu pour contenir les modèles de **réponse Pydantic** de l’API FastAPI.

### Objectif :
- Permet de garantir des retours structurés et typés dans l’API.
- Améliore la doc Swagger automatiquement.
- 🔧 Actuellement vide (commenté), mais prêt à accueillir des classes comme :

```python
class BacktestResponse(BaseModel):
    message: str
    credits_remaining: int
    csv_result: str
    xlsx_result: str
