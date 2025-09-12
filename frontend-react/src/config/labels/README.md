# 📁 src/config/labels/

Ce dossier contient **toutes les définitions de labels dynamiques utilisées dans l’interface utilisateur** du site BackTradz. Il permet d’adapter les noms techniques (backend) en libellés UX clairs, en centralisant la logique de correspondance, de traduction et de formatage des paramètres.

---

## 📄 Fichiers inclus

### 1. `pairs.map.js`

- Contient un mapping des **paires (instruments)** disponibles.
- Structure : `{ [symbol]: nom_affiché }`
- Exemple : `"XAUUSD": "Gold (XAU/USD)"`
- Utilisé dans le UI (dropdowns, filtres, badges…) pour éviter d’afficher des symboles bruts.

---

### 2. `params.map.js`

- **Cœur de la normalisation des paramètres backtest**.
- Sert à :
  - Mapper des clés front lisibles (ex: `minWait`) vers les vraies clés backend (`min_wait_candles`)
  - Forcer les types (`int`, `float`, `bool`, `str`)
  - Fournir des valeurs par défaut si non définies
  - Filtrer uniquement les paramètres attendus par une stratégie spécifique
- Exporte :
  - `ParamAliases` → dictionnaire des alias frontend → backend
  - `unifyParams()` → fonction centrale de normalisation
  - `getUiParamsSpec()` → pour afficher les paramètres dans l’UI

> 📌 C’est ce fichier qui permet de faire marcher les systèmes dynamiques (forms, params, etc.) sans codage manuel.

---

### 3. `strategies.map.js`

- Regroupe les **stratégies disponibles** pour le front.
- Chaque stratégie est identifiée par sa clé backend (ex: `ob_pullback_pure`)
- Structure :
  ```js
  {
    label: "Nom UX",
    short: "Nom court",
    description: "Résumé de la logique",
    paramsOverride: {
      [clé backend]: "Label personnalisé"
    }
  }
