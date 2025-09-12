# 📁 src/sdk/

## 🎯 Rôle du dossier

Ce dossier regroupe tous les **clients API frontend** utilisés dans l'application.  
Chaque fichier est dédié à une zone fonctionnelle précise (auth, backtest, paiements, etc.), et tous utilisent le **client unifié `apiClient.js`** pour gérer les requêtes HTTP, les headers d’auth, et les erreurs.

---

## 📄 Fichiers présents

### ✅ `apiClient.js`
- **Client fetch universel**
- Injecte le token `X-API-Key` automatiquement si `auth: true`
- Gère le `Content-Type`, la sérialisation JSON, le parsing, les erreurs HTTP, etc.
- Peut aussi appeler des URL absolues externes

---

### 👤 `authApi.js`
- Gère toute l’**authentification** :
  - `login`, `register`, `me`
  - `verifyEmail(token)` + `resendVerification()`
- Utilise `auth: false` sauf pour `/me`

---

### 👤 `userApi.js`
- Gère les **actions utilisateur** :
  - `myBacktests()`, `myPurchasedCSVs()`
  - `updateProfile(form)` → extrait nom complet, email, mot de passe
  - `unsubscribe()`, `deleteAccount()`
- Contient aussi `downloadXlsxUrl(filename)` (utilisé dans dashboard)

---

### 📈 `runApi.js`
- Gère les appels liés au **backtest** :
  - `listStrategies()`, `strategyParams()`
  - `runBacktestOfficial(payload)` → payload brut (backend keys déjà clean)
  - `runBacktestMapped(uiPayload)` → payload avec mapping automatique (normalise, filtre, transforme)
  - `runBacktestCustom(formData)` → pour CSV custom
- Contient une grosse logique pour mapper les paramètres frontend vers backend (`RSI`, `ema1`, etc.)

---

### 📊 `backtestXlsxApi.js`
- Gère l'accès aux fichiers `.xlsx` analysés (par dossier / feuille) :
  - `xlsxMeta(folder)` → sheets disponibles
  - `xlsxSheet(...)` → lire une feuille (offset, limit…)
  - `xlsxAggregates(...)` → stats groupées sur "Trades"

---

### 📁 `catalogApi.js`
- Gère la **librairie publique de CSV** (shop) :
  - `listCsvLibrary()`, `listOutputBacktestFiles()`
  - `downloadCsvByPathUrl(path)` → URL directe d’un fichier
  - `myRecentExtractions()` → historiques des extractions (TTL 48h)

---

### 💳 `paymentApi.js`
- Gère tous les **paiements** :
  - Stripe → `stripeSession(offer_id)`, `stripeConfirm(session_id)`
  - PayPal → `paypalCreate()`, `paypalCapture()`
  - Crypto → `cryptoOrder(offer_id, currency)`
- Tous les appels ajoutent le `user_token` manuellement dans le body

---

### 🌍 `PublicXlsxApi.js`
- Version **publique** (pas besoin d’auth) des `.xlsx` :
  - `xlsxMeta(folder)`
  - `xlsxSheet(folder, sheet)`
- Utilisé dans les sections “Insights publics”

---

## 🧠 Best practices

- Toujours passer par `api()` depuis `apiClient.js` pour profiter des protections intégrées
- Caster et filtrer les paramètres au plus tôt (ex: `runBacktestMapped`)
- Préférer `auth: false` explicitement pour les routes publiques
- Éviter les chemins codés en dur : toujours encoder (`encodeURIComponent`)

---

## ✅ Design propre

- Chaque fichier = 1 domaine fonctionnel
- Aucun état local, aucun `useEffect` → pur JS
- Zéro logique UI
- Centralisé pour simplifier le debug, les logs, et la maintenance

---

