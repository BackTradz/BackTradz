# 📁 src/config/docs/

Ce dossier contient toute la documentation statique destinée à alimenter la page **"À savoir"** du site BackTradz, en particulier dans la section technique.

Il centralise les **fiches explicatives des paires (instruments)** et **des stratégies** utilisées dans le backtest. Ces données sont utilisées à la fois pour l’affichage front-end (page informative) et pour structurer dynamiquement les composants.

---

## 📄 Fichiers inclus

### 1. `pairs.docs.js`

- Fiches documentaires complètes pour chaque **symbole** (forex, indices, crypto, futures…).
- Contenu structuré avec les champs suivants :
  - `label` → nom UX affiché (ex: "Gold (XAUUSD)")
  - `summary` → 1 à 2 phrases de résumé clair sur l’instrument
  - `specs` → puces techniques : pip, sessions, catalyseurs…
  - `notes` → remarques spécifiques : pièges, conseils backtest
  - `links` → liens internes vers le backtest ou le CSV shop
- Contient aussi :
  - `PAIR_PIPS` → dictionnaire de la valeur du pip par symbole
  - `getPip()` → helper pour récupérer dynamiquement un pip (supporte `symbol` avec ou sans slash)

> 🔁 Les clés correspondent à celles utilisées dans `pairs.map.js` pour garantir la cohérence.

---

### 2. `strategies.docs.js`

- Fiches documentaires des **stratégies** backtestables.
- Chaque entrée est une stratégie avec 3 champs :
  - `summary` → résumé global de la logique
  - `entry[]` → conditions d’entrée listées pas à pas
  - `params[]` → liste des paramètres associés avec description
    - Chaque param a :
      - `name` → clé utilisée côté backend
      - `desc` → description courte affichée dans le UI

> ⚠️ Les clés doivent correspondre aux noms backend (`strategy_name`) des fichiers de stratégie Python.

---

## 🧠 Bonnes pratiques

- Tous les textes sont en **français clair**, adaptés à un public de traders non-tech.
- Penser à rester synchronisé avec :
  - Les clés du mapping `pairs.map.js`
  - Les noms des stratégies Python (backend)
- Aucun champ technique n’est codé en dur dans le front → toute la logique repose sur ces fichiers.

---

## 🛠️ Utilisation

- Chargés dynamiquement dans la page **À savoir**
- Servent à enrichir la compréhension utilisateur avant le passage à l’action (achat CSV, lancement de backtest)
- Peut être mis à jour sans changer le code source front ou back

---
