// ============================================================
// RequireAuth.jsx
// ------------------------------------------------------------
// RÔLE : protéger les pages privées (toute route nécessitant un token).
// - Si AuthContext.loading === true -> affiche un loader pendant la vérif initiale.
// - Si un ?apiKey=... est présent (retour OAuth), on NE REDIRIGE PAS : on attend
//   qu'AuthContext récupère l'user et nettoie l'URL.
// - Sinon, si pas de token -> redirection /login.
// ============================================================
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth() {
  const { loading } = useAuth();
  const location = useLocation();

  // 1) Pendant la vérif initiale, ne pas rediriger
  if (loading) return <div style={{ padding: 20 }}>Chargement…</div>;

  // 2) Si on atterrit avec ?apiKey=... (retour OAuth), laisser AuthContext finir le boulot
  let landingToken = null;
  try {
    const q = new URLSearchParams(location.search);
    landingToken = q.get('apiKey') || q.get('token');
  } catch (_) {
    /* no-op */
  }
  if (landingToken) {
    // petit suspense visuel possible ici si tu veux
    return <div style={{ padding: 20 }}>Connexion en cours…</div>;
  }

  // 3) Sinon, on se base sur la présence du token persisté
  const token = localStorage.getItem('apiKey');
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 4) OK -> rend les routes enfants protégées
  return <Outlet />;
}
