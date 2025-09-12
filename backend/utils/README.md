# 📁 backend/utils/

## 🎯 Rôle du dossier

Ce dossier contient tous les **outils techniques réutilisables** pour le backend :
- Logging
- Paiement
- Email
- Extraction de données
- Pip / run_id / subscriptions…

---

## 📄 Fichiers présents

### 🔹 `logger.py`
> 📓 Logger principal (console + fichier `.log`) + log params strat
- Log dans `logs/stratify_YYYY-MM-DD.log`
- Log aussi les params dans des `.txt` ou `.json` pour usage interne
- Utilisé par `runner.py`, `analyseur.py`, etc.

---

### 🔹 `email_sender.py`
> 📧 Envoie d’emails HTML via SMTP sécurisé
- Supporte STARTTLS, SSL, AUTO
- Configurable via `.env` (`SMTP_HOST`, `SMTP_USER`, etc.)
- Utilisé pour l’envoi des emails d’inscription, reset password…

---

### 🔹 `email_templates.py`
> 🧩 Templates HTML prêts à envoyer
- Utilisés pour les emails (`signup_success`, `reset_link`, etc.)
- Contiennent : titre, HTML, fallback texte

---

### 🔹 `golden_hour_extractor.py`
> ⏱ Analyse un `.xlsx` (onglet “Par_Heure”) pour détecter les “golden hours”
- Donne :
  - Winrate TP1 global
  - Top 3 heures avec meilleur TP1
- Utilisé dans l’overlay insight et dashboard

---

### 🔹 `payment_utils.py`
> 💳 Applique les effets d’un paiement :
- Ajoute crédits / set abonnement
- Historise la transaction (dans `purchase_history`)
- Gère les duplicatas PayPal via `order_id`
- Utilisé par les Webhooks Stripe, PayPal et Crypto

---

### 🔹 `pip_registry.py`
> 📏 Source de vérité des *pip sizes* pour chaque paire (XAU, JPY, BTC…)
- `get_pip(symbol)` retourne le pip correct avec fallback :
  - Forex JPY → 0.01
  - XAU → 0.1
  - Crypto → 1 ou 0.01
  - Indices → 1
- Ultra robuste, 0 régression même en cas de symbole inconnu

---

### 🔹 `run_id.py`
> 🧬 Génère un identifiant unique (`run_id`) pour un backtest
- Hash stable (10 chars) basé sur :
  - stratégie, paire, TF, période, SL/TP, params, user_id
- Utilisé pour créer un nom de dossier unique dans les logs / fichiers

---

### 🔹 `subscription_utils.py`
> ♻️ Cron de renouvellement d’abonnement
- Détecte les abonnements actifs
- Ajoute automatiquement les crédits
- Historise dans `purchase_history`
- Utilisé par APScheduler (`main.py`)

---

### 🔹 `templates.py`
> 🧰 Wrapper FastAPI / Jinja2Templates
- Permet d’utiliser des templates HTML dans les routes
- Répertoire `frontend/templates` automatiquement configuré

---

## 🔌 Dépendances internes

Certains fichiers utilisent :
- `backend/models/users.py` ou `offers.py` pour lire/écrire le fichier `users.json`
- `backend/database/` pour stocker les fichiers d’utilisateur

---

## 📦 Suggestions futures

- Ajouter un `notifier.py` (webhook Telegram, Slack…)
- Extraire les fallback crypto dans un fichier dédié (`pip_crypto.json` ?)
- Ajouter logs séparés pour erreurs email (fichier `email_errors.log`)

---

