# src/auth/

Garde et contexte d’authentification côté front pour BackTraz.

## Contenu

- **AuthContext.jsx**  
  Contexte global d’authentification.  
  - Expose `{ user, setUser, loginSuccess, logout, loading }`.  
  - Au montage : si un token `apiKey` existe en `localStorage`, appelle `/api/me` via `sdk/authApi.me()` pour peupler `user`.  
  - `loginSuccess(token)` : enregistre `apiKey` dans `localStorage`.  
  - `logout()` : supprime `apiKey` et remet `user=null`.  
  - `loading` : `true` uniquement pendant la vérification initiale du token.

- **RequireAuth.jsx**  
  Garde de route “auth requise”.  
  - Si `loading` (vérification initiale) → affiche un petit loader.  
  - Si pas de `apiKey` → redirige `/login`.  
  - Sinon → rend les routes enfants (`<Outlet />`).

- **RequireAdmin.jsx**  
  Garde de route “admin only”.  
  - Si pas d’utilisateur → redirige `/login`.  
  - Si l’utilisateur n’est pas l’admin attendu → redirige `/dashboard`.  
  - Sinon → rend les routes enfants (`<Outlet />`).  
  - **Actuellement** l’admin est déterminé par un email **hardcodé**.  
    - Pour évoluer : remplacer par un champ `user.role === 'admin'` renvoyé par `/api/me`.

## Flux d’auth côté front

1. Au chargement de l’app, `AuthProvider` vérifie `localStorage.apiKey`.  
2. S’il existe, il tente `GET /api/me` via `sdk/authApi.me()` :  
   - Succès → `user` est enregistré dans le contexte.  
   - Échec → le token est supprimé du `localStorage`.  
3. Les routes protégées passent par `RequireAuth` (token requis).  
4. Les routes admin passent par `RequireAdmin` (vérif email admin).

## Dépendances/Contrats Backend

- Le backend doit accepter un token en header (ex.: `X-API-Key`) et lier `/api/me` à ce token.  
- `/api/me` doit renvoyer un **objet user** cohérent : `{ email, credits, plan, ... }`.  
- Les **routes admin backend** doivent vérifier qu’un utilisateur a le rôle admin (ne pas se fier uniquement au front).

## Points de config/déploiement

- **Clé localStorage** : `apiKey` (si vous la renommez, changez-la dans les 3 fichiers).  
- **Timezone** : aucune dépendance directe ici, mais la stack globale est en `Europe/Brussels`.  
- **Sécurité** : ne stockez jamais de secrets sensibles côté front. Le serveur reste l’autorité.  
- **Multi-onglets** : en cas de besoin, synchroniser logout/login via l’event `window.addEventListener('storage', ...)`.

## Pièges connus

- `RequireAuth` ne force pas le chargement de l’objet `user` (il checke seulement la présence du token).  
  - C’est un choix UX pour éviter un “mur de chargement” sur toutes les pages.  
- `RequireAdmin` utilise un email **fixe** : pratique pour démarrer, à migrer vers un champ `role` pour la scalabilité.  
