# components/home/

## 🎯 Rôle du dossier

Composants principaux de la page d’accueil publique (`/`) :
- Section Hero = accroche visuelle et textuelle + CTA
- Fond animé type EMA pour ambiance “trading dynamique”
- Message de valeur animé avec `framer-motion`
- Section "Top stratégies" avec données dynamiques
- Overlay de preview lecture seule (KPIs publics)

---

## 📁 Contenu

### `HeroSection.jsx`
> Section principale Hero (visible dès le chargement)
- Fond dynamique via `AnimatedEMABG`
- Texte animé (h1 + p) + CTA vers dashboard ou auth
- Comportement conditionnel : `localStorage.apiKey` ⇒ redirige

---

### `AnimatedEMABG.jsx` + `AnimatedEMABG.css`
> Canvas dynamique de fond (EMA rapide, lente, piliers, sparks…)
- Props :
  - `speedPx`, `volatility`, `emaFastPeriod`, `emaSlowPeriod`
  - `showNeon`, `showSparks`, `pillarCount`, etc.
- Utilisé uniquement dans `HeroSection`
- Design contrôlé via les variables CSS dans `AnimatedEMABG.css`

---

### `HeroMessage.jsx` + `HeroMessage.css`
> Bloc d’accroche “Créer par des traders, pour des traders”
- Affiché **en-dessous** du graphe EMA
- Texte animé (motion h1, p, liste bullet)
- Bouton “Voir comment ça marche” → redirige vers `/a-savoir`
- Liste de 3 bullet points pour les features clés
- Design : fond flouté en verre, responsive, avec chips et CTA

---

### `TopStrategies.jsx`
> Section “🔥 Top stratégies du moment”
- Charge dynamiquement les 3 à 6 meilleures stratégies via `/api/top-strategy`
- Affiche : paire, TF, stratégie, winrate TP1, nb de trades
- Bouton `Voir les détails` → ouvre l’`overlay PublicInsightsOverlay`
- Skeleton affiché en attendant le chargement ou en cas d’erreur
- Si aucun `folder` dispo pour la stratégie → message explicite dans l’overlay

---

## 🔗 Dépendances

- `PublicInsightsOverlay.jsx` (lecture seule des CSV publics)
- `framer-motion` pour toutes les animations d’entrée
- `CTAButton`, `SectionTitle` (UI)
- API : `/api/top-strategy`

---

## ✅ Check points

- [x] Comportement conditionnel OK (auth vs non-auth)
- [x] Responsive 100% (mobile/tablette inclus)
- [x] Skeletons et fallback UX gérés
- [x] Motion fluide sans bug
- [x] Navigation propre (`navigate`, `href`, `onClick`)

---

## 🧠 Idées d’évolution

- Ajouter une vidéo démo à droite du Hero ?
- Passer le Hero en composant full-page avec scroll-snap ?
- Rendre les Top stratégies cliquables vers une page `stratégie/:id` ?
- Ajouter un "live ticker" BTC/ETH en fond avec d3.js ?

