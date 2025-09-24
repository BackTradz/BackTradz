# 📁 backend/routes/ — README des routes API

Ce dossier regroupe **toutes les routes FastAPI** qui structurent ton backend. Chaque fichier correspond à un segment fonctionnel clair du SaaS **BackTradz**.

---

## 🔐 Auth & Utilisateur

### `auth_reset_routes.py`
- **Rôle** : Reset mot de passe, vérification email, création token.
- 🔐 Vérifie le token de reset avant modification.
- 📤 Envoie mail via `email_sender.py`.

### `user_routes.py`
- **Rôle** : Routes génériques utilisateur (`/me`, `/register`, `/set-password`, etc.)
- ✅ Hash bcrypt, validation forte des champs (username, password).
- 📥 Enregistrement sécurisé (limite recréation).
- 🔒 Accès conditionné à `get_current_user`.

### `user_profile_routes.py`
- **Rôle** : Affichage, édition, suppression du profil utilisateur.
- 🛠️ Modifie le profil avec formulaire (`POST /api/profile/update`).
- ✅ Supprime compte ou désabonne via `/api/profile/delete` / `/unsubscribe`.

---

## 📊 Backtest & Analyse

### `run_backtest_route.py`
- **Rôle** : Lancement de backtest à partir d'un CSV + strat + params.
- ⚙️ Gère le dossier, la strat, la période, l’ID utilisateur.
- 🔁 Peut être déclenché en parallèle.

### `analyse_routes.py`
- **Rôle** : Lecture et analyse de fichiers XLSX générés par les backtests.
- 📄 Extrait les feuilles (sheets), les valeurs, les stats.
- 🔍 Utilisé dans les dashboards + section épinglages.

---

## 📁 Bibliothèque CSV

### `csv_library_routes.py`
- **Rôle** : Vente et affichage des fichiers CSV disponibles.
- 💳 Intégré avec système de crédits.
- 📂 Liste, filtre, téléchargement, preview.

### `backtest_xlsx_routes.py`
- **Rôle** : Téléchargement, extraction et affichage des fichiers `.xlsx` utilisateurs.
- 📑 Permet d’extraire les données par feuille / filtre dans dashboard.

### `official_data_routes.py`
- **Rôle** : Données publiques “premium” (Top stratégies, stats publiques).
- 🔓 Aucune authentification requise.
- ✅ Peut être appelée depuis page accueil.

---

## 💸 Paiements & Offres

### `stripe_routes.py`
- **Rôle** : Paiement via Stripe (abonnements ou crédits).
- 🔁 Webhook intégré pour vérifier / renouveler les plans.
- 🔐 Gère réductions, dates de renouvellement, etc.

### `paypal_routes.py`
- **Rôle** : Paiement par PayPal.
- ✅ Webhook intégré.
- 📦 Applique crédits à l’utilisateur.

### `crypto_routes.py`
- **Rôle** : Paiement crypto via NowPayments.
- ✅ Crée transaction, vérifie statut, applique crédits.

### `pricing_routes.py`
- **Rôle** : Liste les offres disponibles (`SUB_9`, `SUB_25`, packs one-shot).
- 🛒 Exposé en front dans `/pricing`.

---

## 📈 Statistiques & Dashboard

### `admin_routes.py`
- **Rôle** : Dashboard admin complet : utilisateurs, crédits, suppression.
- 🛡️ Accès uniquement admin (via `admin.json`).
- ✏️ Permet modifications directes.

### `admin_stat_routes.py`
- **Rôle** : Statistiques globales : ventes, crédits, performances CSV.
- 📊 Donne base pour les KPIs (revenus/jour, crédits/heure, heatmaps...).
- ⚙️ Peut être rafraîchie dynamiquement.

### `user_dashboard_routes.py`
- **Rôle** : Données spécifiques à l’utilisateur connecté.
- 📈 Liste de ses backtests, téléchargement, suppression, filtres par paire.

---

## ⚙️ Fonctionnel

### `frontend_routes.py`
- **Rôle** : Sert les pages HTML (`auth.html`, `profile.html`, etc.) via Jinja2.
- 📤 Système de redirection propre pour login / register / profil.
- 🎨 Utile pour fallback SSR.

### `a_savoir_routes.py`
- **Rôle** : Contenu statique pour la section "À savoir".
- 📄 Utilisé dans `components/a_savoir/`.
- 🔧 Renvoie doc techniques, stratégies, explications.

### `strategy_params_route.py`
- **Rôle** : Permet de récupérer dynamiquement les paramètres d’une stratégie.
- 🔍 Inspecte `detect_...` et retourne noms / valeurs par défaut.
- 🧠 Utilisé pour auto-remplir le front selon la stratégie choisie.

### `top_strategy_routes.py`
- **Rôle** : Génère le top 3 des stratégies automatiquement chaque jour.
- 📈 Tri selon le meilleur winrate TP1.
- 🧩 Branché dans page d’accueil + admin + public.

### `support_routes.py`
- **Rôle** : Réception de messages support depuis le front.
- 📬 Stockés en JSON local ou envoyés en mail.
- 🔒 Optionnel : CAPTCHA ou throttle à prévoir.

---

## 📁 Fichiers spéciaux

- Tous les fichiers suivent une convention : `*_routes.py`.
- Chaque route est **documentée en docstring** et **segreguée par rôle**.
- 🔐 Authentification via token ou header `X-API-Key`.
- 📤 Certaines routes (frontend, profile) utilisent Jinja2 pour servir HTML directement.

---
