# components/overlay/

## 🎯 Rôle du dossier

Composants d’**overlay** pour visualiser des résultats de backtests :
- `BacktestInsightsOverlay` = version privée (dashboard)
- `PublicInsightsOverlay` = version lecture seule (home)
- CSS dédiés aux vues insights = `insights.css`, `insightspublic.css`

Chaque overlay suit le même pattern :
- `div.ins-root` monté en overlay (avec backdrop semi-transparent)
- Panel `.ins-panel` en `fixed` centré
- En-tête, onglets, contenu dynamique
- Tableaux avec scroll horizontal + vertical
- Lecture des CSV transformés en JS (`xlsxSheet()`)

---

## 📁 Contenu

### `BacktestInsightsOverlay.jsx`
> Overlay privé (dashboard utilisateur)
- Récupère dynamiquement les données CSV d’un backtest (dossier)
- Onglets dynamiques : Global, Par Heure, Par Session, etc.
- Filtres et KPIs (total trades, winrate, SL/TP, RR, etc.)
- Possibilité d’épingler des insights dans `localStorage.btPins_v1`
- Composant monté via `createPortal()` dans la page

---

### `PublicInsightsOverlay.jsx`
> Overlay lecture seule (accès public via la page d’accueil)
- Identique en structure à la version privée
- Aucune action utilisateur possible (pas de pin)
- Récupère uniquement les données publiques (`xlsxMeta`, `xlsxSheet`)
- Gère les cas d’erreur :
  - Pas de `folder` fourni
  - Pas de feuilles dans le fichier
- Utilise le même style (`.ins-data`, `.ins-body`, etc.)

---

### `insights.css`
> Styles principaux pour l’overlay (privé et public)
- Layout : `.ins-root`, `.ins-panel`, `.ins-header`, `.ins-body`, `.ins-tabs`
- Tables :
  - Scroll horizontal auto (`.table-wrap`)
  - Colonnes dynamiques (`grid-template-columns`)
  - Bouton "pin" stylisé
- Scrollbars visibles (Firefox + WebKit)
- Responsive (adaptation `.ins-panel` pour grands écrans)

---

### `insightspublic.css`
> Patchs supplémentaires pour la version publique
- Stylise le bouton CTA d’ouverture (`.ts-cta`)
- Hover + clic visuel

---

## 🔗 Dépendances

- `sdk/publicXlsxApi.js` → fonctions `xlsxMeta()` et `xlsxSheet()`
- `lib/labels.js` → `formatPair`, `formatStrategy`
- `PillTabs.jsx` → onglets visuels réutilisables

---

## ✅ Vérifications faites

- [x] Responsive : panel centré, scrolls fonctionnels
- [x] Accessibilité minimale : `role=dialog`, `aria-modal=true`
- [x] Données sensibles absentes en public
- [x] Normalisation des noms de feuilles (strings ou objets)
- [x] Tous les KPIs sont dynamiques, lisibles et précis

---

## 🧠 Évolutions possibles

- Ajouter un bouton “Copier insight” (comme image ou texte)
- Rendre les KPIs “exportables” ou partageables
- Support des feuilles supplémentaires (`drawdown`, `RR split`, etc.)
- Ajouter une option de visualisation graphique (`Victory`, `Chart.js`, etc.)

