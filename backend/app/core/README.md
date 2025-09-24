# 📁 backend/core/

## 🎯 Rôle du dossier

Ce dossier contient les **fonctions cœur du backtest et de l’analyse**, utilisées par l’API, le dashboard ou les scripts auto.  
Il sert de pont central entre le frontend, les stratégies utilisateur et le système de génération des fichiers CSV/XLSX.

---

## 🔹 `runner_core.py`

> 🚀 Exécute une stratégie sur des données OHLC (`df`) et produit un fichier `.csv` des résultats du backtest (TP1/TP2/SL)

### Étapes clés :
1. ✅ Vérifie que le DataFrame contient bien les colonnes obligatoires : `Open`, `High`, `Low`, `Close`, `time`
2. 🧹 Nettoie les données (conversion en float, suppression des rows corrompues, renommage RSI si besoin)
3. 📏 Récupère le `pip` adapté au symbole (`get_pip`)
4. 🛠 Formate dynamiquement les `params` selon :
   - leur nom
   - leur type attendu (via `inspect.signature`)
   - des alias courants (`min_wait` → `min_wait_candles`)
   - des conversions (`*_pips` → prix brut)
5. 🧠 Appelle dynamiquement la stratégie Python importée (`strategy_func`) avec les bons paramètres (`df.copy(), **params`)
6. 📊 Boucle sur les signaux détectés et calcule pour chaque :
   - SL / TP1 / TP2
   - RR
   - Résultat (TP1 / TP2 / SL)
7. 📁 Crée un dossier unique basé sur un `run_id` stable (hash de la stratégie, params, etc.)
8. 💾 Enregistre le CSV `backtest_result.csv` dans ce dossier
9. 📝 Sauvegarde les paramètres exacts utilisés (y compris les valeurs par défaut si pas fournies) dans un `.json` pour suivi
10. 🔐 Injecte `run_id` et `user_id` dans ce `.json` pour traçabilité complète

### Fichiers produits :
- `backtest_result.csv` → résultats backtest
- `params.json` → config réelle utilisée
- Dossier : `backend/data/analysis/<symbol>_<tf>_<strat>_<période>_sl100__h<run_id>`

---

## 🔹 `analyseur_core.py`

> 📈 Lance une **analyse statistique** à partir d’un fichier `.csv` de résultats généré par le runner

### Fonction `run_analysis(csv_path, strategy_name, symbol, sl_pips, period)`

- 📂 Utilise `backend/analyseur.py` pour parser les résultats
- Génére un fichier `.xlsx` dans le même dossier que le `.csv`
- Le nom est formaté automatiquement :
  - `analyse_<strat>_<symbol>_SL<sl>_<période>_resultats.xlsx`
- 🔒 Tout est encapsulé dans un `try/except` pour garantir qu’une erreur n’empêche pas la suite du traitement

---

## ✅ Liens avec les autres blocs

- Appelés directement dans les routes `run_routes.py` et `analyse_routes.py`
- Utilisent :
  - `utils/logger.py` pour loguer les paramètres
  - `utils/run_id.py` pour créer un dossier unique
  - `utils/pip_registry.py` pour adapter les valeurs à chaque paire
- Chaque run est isolé : pas de side-effects entre utilisateurs

---

## 🧠 Suggestions d’évolution

- Ajouter une fonction `run_full_pipeline()` qui fait runner + analyseur en un seul appel
- Intégrer un mode debug pour afficher visuellement les points d’entrée / TP/SL
- Ajouter un fallback de strat `mock_strategy()` si une stratégie plante

---
