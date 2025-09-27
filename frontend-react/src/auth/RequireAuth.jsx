// ============================================================
// RequireAuth.jsx
// ------------------------------------------------------------
// RÔLE : protéger les pages privées (toute route nécessitant un token).
// v1.2 : n'est plus utilisé pour bloquer les pages de lecture (pricing, csv-shop, backtest…).
// - Il ne reste appliqué que pour /profile et /admin (via <RequireAdmin/>).
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
  // ⛑️ Anti-bounce: si on arrive avec ?apiKey=... dans l’URL, laisse 1 tick que main.jsx l’écrive.
  const hasApiKeyInUrl = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("apiKey");
  if (hasApiKeyInUrl) {
    return <div style={{padding:16}}>Connexion en cours…</div>;
  }
  const { loading } = useAuth(); // [BTZ] 'loading' = vérification initiale en cours ?

  // [BTZ] Pendant la vérification initiale du token, afficher un indicateur visuel
  if (loading) return <div style={{padding:20}}> Chargement…</div>;

  // ⛱️ Cas retour OAuth: si l’URL contient ?apiKey= ou ?token=,
  // on NE redirige pas (AuthContext va l’enregistrer dans 0-300ms).
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('apiKey') || q.get('token')) {
      return <div style={{padding:20}}>Connexion en cours…</div>;
    }
  } catch (e) {
    void e; // no-op pour calmer eslint/no-unused-vars
  }



  // [BTZ] Vérifie simplement la présence du token côté front
  const token = localStorage.getItem('apiKey');
  if (!token) return <Navigate to="/login" replace />;

  // [BTZ] OK -> rend les routes enfants protégées
  return <Outlet />;
}
