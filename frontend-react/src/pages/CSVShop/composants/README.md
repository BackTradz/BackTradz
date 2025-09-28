# components/CSVshop/

## 🎯 Rôle du dossier

Composants de la boutique CSV :
- Bannière explicative
- Filtres
- Extraction manuelle
- Résultats personnalisés

---

## 📁 Contenu

### `CSVInfoBanner.jsx`
- Bandeau d’information sur les fichiers vendus (colonnes, sample)
- Popover cliquable
- Hover + ESC/extérieur pour fermeture

### `CSVShopFilters.jsx`
- Filtres de la boutique :
  - Recherche texte
  - Select paire
  - Select mois
  - Bouton toggle vers extracteur

### `ExtractorInline.jsx`
- Extracteur CSV manuel
- Paire, TF, dates (input + presets)
- Appel `handleExtract()` avec les bons paramètres

### `PrivateExtraction.jsx`
- Section conditionnelle pour afficher les fichiers extraits
- Liste `CsvCard` avec lien direct (avec token)
- Toggle show/hide

---

## 🔗 Dépendances

- `CTAButton`, `Select`, `DetailButton`
- `CsvCard` pour affichage des fichiers
- `localStorage` pour sécurisation du lien

---

## ✅ Check

- [x] Aucun composant critique
- [x] Composants isolés, réutilisables
- [x] Aucune suppression ou état global
