# 📁 frontend-react/

## 🎯 Rôle du dossier

Contient toute la structure du **frontend React** de BackTradz :
- Routing public/privé
- Authentification contextuelle
- Appel d'API centralisé
- Styling global (Tailwind + CSS custom)
- Pages dynamiques connectées au backend FastAPI

---

## 📄 Fichiers racine

### ✅ `main.jsx`

> Point d’entrée principal de l'application React

- Injecte le composant `<App />` dans l’élément `#root`
- Initialise `React.StrictMode`, `BrowserRouter`, et le `AuthProvider`
- Lit l’`apiKey` dans l’URL si elle est présente (`?apiKey=...`)
  - Utile pour auto-login ou redirection depuis OAuth
  - Stocke l’`apiKey` dans le `localStorage`
  - Nettoie proprement l’URL après extraction

---

### ✅ `App.jsx`

> Définit **toutes les routes** de l’application

#### Structure :
- Routes publiques : `/`, `/login`, `/forgot-password`, etc.
- Routes privées : encapsulées dans `<RequireAuth />`
- Routes admin : encapsulées dans `<RequireAdmin />`
- Layout global partagé : `<AppLayout />` (Navbar/Footer)

#### Pages principales :
- `Home`, `AuthPage`, `Backtest`, `CSVShop`, `Pricing`, `Profile`, `Dashboard`, etc.
- Routes légales : `MentionsLegales`, `CGU`, `Confidentialité`
- `Success` : page de confirmation post-paiement
- `A_Savoir` : page technique/documentaire

---

### ✅ `index.css`

> CSS global appliqué à tout le site

#### Fonctions principales :
- Reset des marges/paddings `html, body`
- Forçage du fond sombre (`#1e293b`) et couleur de texte (`#e5e7eb`)
- Police par défaut : `Inter` / `ui-sans-serif` optimisée pour lisibilité
- Classes `.topstrat-*` pour layout responsive sur la section Top Strategies
- Empêche tout débordement horizontal (`overflow-x: clip`)
- Scrollbar stabilisée (`scrollbar-gutter: stable`)
- Global `box-sizing: border-box`

---

## ✅ Stack utilisée

- **React 18**
- **React Router DOM** pour le routing
- **Context API** pour la gestion de l'authentification (`AuthContext`)
- **Tailwind CSS** + CSS custom (`index.css`)
- Front entièrement **SPA** (Single Page Application)

---

## 🔐 Authentification

- Utilise un `AuthProvider` basé sur `localStorage` (`apiKey`)
- Les routes privées sont bloquées sans token
- Redirections intégrées après login
- Admin = simple booléen (`user.is_admin`) lu depuis `/me`

---

## 🧠 À noter

- Aucun appel d’API direct dans `main.jsx` ou `App.jsx` → tout passe par `sdk/`
- Aucun composant UI ici : juste structure, layout, auth, routing
- Les animations sont gérées dans les composants internes (ex: `HeroSection`, `AuthPage`, etc.)

---

