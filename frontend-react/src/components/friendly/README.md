# components/friendly/

## 🎯 Rôle du dossier

Composants "friendly" = version user-friendly des inputs ou selects :
- Masquent la logique backend (nom de paramètre, type brut)
- Affichent des labels clairs, des descriptions utiles
- Mapping intelligent des stratégies / paires / paramètres

👉 Utilisés principalement sur :
- Les interfaces publiques (inscription, config user)
- Le futur formulaire de backtest custom
- L’admin s’il faut éditer une strat ou un input

---

## 📁 Contenu

### `FriendlyParamInput.jsx`
> Champ dynamique basé sur la stratégie et la clé param
- Affiche un input adaptatif selon le type (`boolean`, `number`, `text`)
- Résout :
  - le type (`resolveParamType`)
  - le label (`resolveParamLabel`)
  - la description (`resolveParamHelp`)
  - les contraintes (`resolveParamConstraints`)
- Envoie directement la valeur avec `onChange(value)`
- Exemples :
  - `min_wait_candles → Nombre de bougies d’attente (ex: 3)`
  - `is_entry_confirmed → case à cocher`

---

### `FriendlySelect.jsx`
> Select générique avec mappage interne
- Props :
  - `mapping` = `"strategies"` ou `"pairs"`
  - `value`, `onChange` → gèrent la clé backend
  - `label`, `help` → affichage user
- Les options sont générées via `strategyOptions()` ou `pairOptions()` (depuis `lib/labels`)
- ⚠️ Le champ `value` correspond toujours à la **clé backend** (`ob_pullback_rsi`, `BTC-USD`, etc.)

---

### `PairSelect.jsx`
> Spécialisation de `FriendlySelect`
- Fixe `mapping="pairs"`
- Label par défaut : “Paire”
- Help : “Sélectionne l’instrument à backtester”
- Sert dans les formulaires là où une paire doit être choisie, sans recopier la logique

---

## 🔗 Dépendances internes

- `lib/labels.js` (fonctions : `resolveParamLabel`, `resolveParamHelp`, `strategyOptions`, etc.)
- `FriendlySelect.jsx` est la base de `PairSelect.jsx`

---

## ✅ Check intégration

- [x] Les composants utilisent les labels dynamiques centralisés
- [x] Aucun `hardcoded label` ou nom de param exposé
- [x] Code 100 % compatible SSR / React strict
- [x] Facile à styliser via Tailwind / className

---

## 🧠 Idées d’évolution

- Ajouter `mapping="timeframes"` ou `"params"` ?
- Support d’un `mode readOnly` pour affichage pur
- Exporter `resolveAllParamMeta()` pour usage admin
