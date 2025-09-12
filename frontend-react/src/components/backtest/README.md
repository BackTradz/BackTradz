# components/backtest/

## 🎯 Rôle du dossier

Composants UI réutilisables liés aux backtests :
- Résumés visuels
- Inputs dynamiques de stratégie
- Sélecteurs de dates
- Progressions animées
- Choix de timeframes

---

## 📁 Contenu

### `BacktestCard.jsx`
- Affiche un backtest (stratégie, période, winrate)
- Téléchargement `.xlsx` intégré

### `DatePresets.jsx`
- 4 presets (7j / 30j / mois actuel / mois passé)
- Applique une range `(start, end)` en `YYYY-MM-DD`

### `InlineProgress.jsx`
- Petite barre de progression (utilisée dans les overlays)

### `ParamInput.jsx`
- Champ dynamique utilisé pour configurer une stratégie
- Gère booléens, string, number
- Envoie les valeurs via `onChange(name, value)`

### `TFSegment.jsx`
- Sélecteur visuel de timeframe parmi `["H4","H1","M30","M15","M5"]`
- Pas de M1/D1 par choix volontaire

### `TopProgressBar.jsx`
- Barre en haut de page qui montre l’avancement global
- Utilisée pour le traitement CSV ou backtest long

---

## 🔗 Dépendances internes

- `Card`, `Button` → UI
- `usePip()` → Hook custom qui retourne le pip d'une paire
- `downloadXlsxUrl()` → SDK userApi

---

## ✅ Checklist intégration

- [x] Tous les composants sont 100% autonomes
- [x] Aucune dépendance circulaire
- [x] Aucune logique critique supprimée
- [x] Couverture ARIA + accessibilité basique OK
- [x] Zéro prop non utilisée

---

## 💡 À noter

- Tu peux rendre `TFSegment` paramétrable avec un array de TF à afficher si besoin plus tard.
- `InlineProgress` + `TopProgressBar` peuvent être unifiés via props si tu veux DRY le code.
