# 📁 src/lib/

## 🎯 Rôle du dossier

Ce dossier contient des **helpers front-end globaux** réutilisables dans tout le projet.  
Il est conçu pour éviter la duplication de logique métier (formatage, transformation de données, etc.) dans les composants.

---

## 📄 Fichier actuel

### `labels.js`

> 🔧 Outils de formatage liés aux labels affichés (UX)

Ce fichier centralise la logique pour :
- **Formater** proprement les noms de paires, stratégies, paramètres
- **Générer** des listes de `<Select>` dynamiques
- **Fournir** des tooltips, types ou labels fallback

---

### 🔗 Dépendances

Ce module dépend de :
- `strategies.map.js`
- `params.map.js`
- `pairs.map.js`

Qui sont tous importés depuis `src/config/labels/`

---

### 🔍 Fonctions exposées

#### 🧱 Formatters

| Fonction | Description |
|---------|-------------|
| `formatStrategy(key)` | Affiche un label clair pour une stratégie |
| `formatPair(key)`     | Affiche un label clair pour une paire |
| `formatParam(key, { strategyKey })` | Affiche un label pour un paramètre, en tenant compte des overrides spécifiques à la stratégie |
| `formatParamHelp(key)` | Récupère un texte d’aide sur un paramètre |
| `formatParamType(key)` | Retourne le type de champ attendu (`int`, `float`, etc.) |

---

#### 🧩 Options de select

| Fonction | Utilité |
|----------|---------|
| `toOptions(mapObj)` | Transforme un mapping brut `{key: {label}}` en options `{value,label}` triées |
| `strategyOptions()` | Retourne les options de stratégie pour un `<select>` |
| `pairOptionsFromMap()` | Pareil, mais pour les paires |
| `pairsToOptions(pairs[])` | Transforme une liste de paires en options avec label formaté (et ajoute l’option `"Toutes"`) |

---

## 🧠 Cas d’usage typique

```js
const options = strategyOptions();  // dans un <Select>
const label = formatParam("minWait", { strategyKey: "ob_pullback" });
