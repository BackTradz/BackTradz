// ============================================================
// RequireAuth.jsx
// ------------------------------------------------------------
// RÔLE : protéger les pages privées (toute route nécessitant un token).
// - Si AuthContext.loading === true -> affiche un loader pendant la vérif initiale.
// - Si pas de token en localStorage -> redirige vers /login.
// - Sinon -> autorise l'accès aux routes enfants (<Outlet />).
//
// NOTE
// - On ne vérifie pas ici que 'user' est chargé. On s'appuie uniquement sur la présence du token.
//   La plupart des pages déclenchent ensuite leurs propres fetchs si besoin.
// - Pour une variante stricte, on pourrait exiger user !== null, mais cela impose que /api/me soit
//   systématiquement appelé avant d'accéder aux pages (au prix d'un léger délai).
//
// DÉPLOIEMENT [BTZ-DEPLOY]
// - Changer la clé 'apiKey' -> changer aussi ici (cohérence avec AuthContext).
// - Le backend doit refuser les accès si le token est invalide/expiré (sécurité côté serveur).
// ============================================================
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth() {
  const { loading } = useAuth(); // [BTZ] 'loading' = vérification initiale en cours ?

  // [BTZ] Pendant la vérification initiale du token, afficher un indicateur visuel
  if (loading) return <div style={{padding:20}}> Chargement…</div>;

  // [BTZ] Vérifie simplement la présence du token côté front
  const token = localStorage.getItem('apiKey');
  if (!token) return <Navigate to="/login" replace />;

  // [BTZ] OK -> rend les routes enfants protégées
  return <Outlet />;
}
