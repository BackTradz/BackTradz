# components/dashboard/

## 🎯 Rôle du dossier

Composants React liés au dashboard utilisateur :
- Affichage des backtests personnels
- Cartes récapitulatives
- Overlays de détails (insights, modales)
- Section CSV achetés + extraits
- Système d’épingles ("Mes épingles")
- UI contextuelle (badge crédits, filtres, confirmation suppression…)

---

## 📁 Contenu

### `UserBacktestDashboard.jsx`
> Dashboard simplifié
- Appelle `/api/user/backtests` au chargement
- Filtrage par paire avec `<Select>`
- Affiche des `BacktestCard` (vue compacte)

---

### `BacktestList.jsx`
> Dashboard principal
- Récupère tous les backtests via `/api/user/backtests`
- Tri dynamique (winrate, nb trades, paire)
- Filtres : texte, paire, stratégie
- Affichage dynamique avec `limit` + bouton “Afficher plus”
- Appelle `DashboardBacktestCard` pour le rendu

---

### `DashboardBacktestCard.jsx`
> Carte principale backtest
- Affiche pair, TF, stratégie, période, winrate, trades
- Boutons : Télécharger `.xlsx`, Détails (overlay), Supprimer (dialog)
- Gère : `ConfirmDialog`, `BacktestDetailsModal`, `BacktestInsightsOverlay`
- Pip dynamique via hook `usePip`

---

### `BacktestDetailsModal.jsx`
> Modale détaillée
- Metrics Buy/Sell (winrate, RR, SL/TP)
- Rendu via `createPortal`
- Compact, structuré en `dbt-modal-*`
- Lecture des données via `item.metrics`

---

### `ConfirmDialog.jsx`
> Boîte de confirmation générique
- Portail avec z-index élevé
- Ferme sur clic backdrop ou touche ESC
- Boutons “Annuler” et “Supprimer”

---

### `CreditBadge.jsx`
> Petit badge crédit/plan
- Affiche les crédits restants et l’abonnement actif
- Utilisé dans la navbar utilisateur (à côté de l’avatar)

---

### `CsvList.jsx`
> Section “Mes fichiers CSV”
- Regroupe les fichiers :
  - achetés (`/api/user/csvs` ou `purchase_history`)
  - extraits (`/api/catalog/my-recent-extractions`)
- Parse les noms de fichiers pour détecter les infos
- Génère des `CsvCard` pour chaque fichier
- Tri, filtre par paire, pagination + bouton "Afficher plus"

---

### `BacktestPinsSection.jsx`
> Section “Mes épingles” (version mini)
- Affiche uniquement les pins d’un backtest donné (via `folder`)
- Lecture depuis `localStorage.btPins_v1`

---

### `PinnedInsightsWall.jsx`
> Composant principal "Mes épingles"
- Lecture locale des pins (localStorage)
- Filtres complets : métrique, type, paire, stratégie, période, contexte
- Recherche libre
- Détails overlay pour chaque dossier (insights)
- Suppression épingle manuelle
- Mobile responsive (section repliable)
- Version **copie** = ancienne version, identique à supprimer plus tard

---

## 🔗 Dépendances internes
- `Select`, `CTAButton`, `TopProgress`, `CsvCard`, `BacktestCard`, `BacktestInsightsOverlay`
- `userApi`, `catalogApi`, `authApi`
- `formatPair`, `formatStrategy`, `pairsToOptions`

---

## ✅ Checklist avant déploiement

- [x] Tous les composants passent les props correctement
- [x] Zéro mutation externe
- [x] Modales et overlays passent via `createPortal` (pas de bug z-index)
- [x] Gestion des erreurs API propre
- [x] Aucune donnée sensible en clair
- [x] Accessibilité basique respectée (role, aria-modal, etc.)

---

## 🧠 Tips & évolutions futures

- Tu peux rendre `DashboardBacktestCard` 100 % réutilisable avec un prop `mode="mini"` ou `compact`
- Les pins peuvent être synchronisées en base plus tard → laisser un `TODO`
- Ajouter un système de tags (comme “London only”, “high RR”) dans `BacktestList`
