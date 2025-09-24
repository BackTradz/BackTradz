
📘 Stratify Backend – README
🚀 Description

Ce backend est développé avec FastAPI et gère toute la logique du SaaS Stratify :

Authentification (email + OAuth Google)

Gestion des crédits & abonnements

Lancement de backtests et analyses automatiques

Génération de fichiers CSV / XLSX

Système de paiements (Stripe, PayPal, Crypto)

Dashboard utilisateur et panneau admin



📂 Structure du projet
backend/
│── main.py                  # Point d'entrée FastAPI
│── auth.py                  # Authentification (login/register + Google OAuth)
│
├── routes/                  # 📡 Routes API (admin, user, backtest, paiements…)
│
├── core/                    # ⚙️ Noyau de calcul (runner/analyseur)
│
├── models/                  # 📑 Structures de données (Pydantic + gestion users)
│
├── utils/                   # 🛠️ Fonctions utilitaires (logs, offers, templates…)
│
├── scripts/                 # 📜 Scripts automatisés (ex: top stratégie)
│
├── database/                # 💾 Données persistantes (JSON utilisateurs, transactions…)
│
├── strategies/              # 📊 Fichiers Python contenant les stratégies de backtest
│
├── extract/                 # ⛏️ Scripts pour extraire la data brute depuis broker/API
│
├── data/                    # 📦 Données brutes d’input (si besoin, ex: historiques externes)
│
├── output/                  # 📤 Résultats de backtest (CSV par mois & paire)
│
├── output_live/             # 📡 Données récentes collectées en temps réel (CSV live)
│
└── logs/                    # 📝 Logs de backtest (TXT + JSON)



🏗️ Installation & Lancement

1. Créer un environnement

python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

2. Installer les dépendances

pip install -r requirements.txt



3. Variables d’environnement

Créer un fichier .env à la racine :
STRATIFY_SECRET=super_secret_key
STRIPE_API_KEY=...
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
CRYPTO_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...


4. Lancer le serveur

uvicorn backend.main:app --reload


🔑 Authentification

Login classique : email + mot de passe (stockés dans users.json)

OAuth Google : inscription/connexion rapide via Google

Les routes protégées utilisent un header X-API-Key pour valider le token utilisateur.

💳 Crédits & Abonnements

Les utilisateurs consomment 1 crédit par backtest.

Les crédits sont ajoutés via achat (Stripe, PayPal, Crypto) ou via abonnement (renouvellement auto tous les 30 jours).

Toutes les offres sont centralisées dans utils/offers.py.

📊 Backtests & Analyses

Upload CSV (/upload_csv) ou data officielles (via utils/data_loader).

Backtests → fichier CSV généré.

Analyse → fichier XLSX + stats (Golden Hours, Winrate, etc.).

Logs → sauvegarde des paramètres testés (utils/logger.py).

⚙️ Tâches planifiées

Deux systèmes tournent en parallèle :

repeat_every → vérifie chaque jour les abonnements (renouvellement auto).

apscheduler → génère automatiquement les meilleures stratégies (scripts/top_strategie_generator.py).