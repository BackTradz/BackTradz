# 📁 src/layout/

## 🎯 Rôle du dossier

Contient les **layouts globaux** utilisés pour structurer l’interface de BackTradz.  
Ces layouts définissent le squelette HTML de haut niveau partagé entre toutes les pages : navbar, footer, contenu principal, etc.

---

## 📄 Fichier principal

### `AppLayout.jsx`

> Layout principal utilisé dans la majorité du site (publique + dashboard)

#### Structure :
- Composant **React Router**
  - Utilise `<Outlet />` pour afficher la page en cours
  - S’intègre dans les routes comme `element={<AppLayout />}`

#### Composants inclus :
- `Navbar` (header complet : logo, menu, crédits…)
- `Footer` (liens, copyright)
- `TopProgress` (progress bar globale — actuellement importée mais **non utilisée** dans le JSX)

#### Design :
- `div.flex.flex-col.min-h-screen` : layout vertical full height
- `main.flex-grow.max-w-7xl.mx-auto` : conteneur centré et responsive
- Utilise les **classes Tailwind CSS** avec variables (`bg-bg`, `text-textMain`)

---

## ✅ Remarques importantes

- Le layout est neutre : il **ne contient aucune logique conditionnelle (auth, admin, etc.)**
- Peut être étendu dans le futur avec :
  - `SidebarLayout` pour des pages dashboard plus complexes
  - `AdminLayout` pour séparer la navigation admin
- Le composant `TopProgress` est importé mais non encore monté (à insérer tout en haut pour loader entre pages)

---

## 💡 Exemple d’utilisation (routes)

```jsx
<Routes>
  <Route element={<AppLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/mon-profil" element={<Profile />} />
    <Route path="/dashboard" element={<UserDashboard />} />
    ...
  </Route>
</Routes>
