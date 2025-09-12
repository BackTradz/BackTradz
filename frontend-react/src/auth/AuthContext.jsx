// ============================================================
// AuthContext.jsx
// ------------------------------------------------------------
// RÔLE GLOBAL
// - Fournir un contexte d'authentification pour toute l'app (React Context).
// - Centraliser l'état 'user' (objet utilisateur) et l'état 'loading' (chargement initial).
// - Gérer la persistance du token côté front (localStorage 'apiKey').
// - Exposer des helpers :
//     • loginSuccess(token) -> enregistre le token après un /api/login réussi.
//     • logout()            -> efface le token + remet user à null.
// - Au montage, si un token existe déjà, tenter de récupérer l'utilisateur via /api/me.
//
// IMPLICATIONS DÉPLOIEMENT [BTZ-DEPLOY]
// - Le backend doit accepter un header X-API-Key (ou équivalent) véhiculant 'apiKey'.
// - L’endpoint /api/me doit renvoyer un objet user exploitable par le front (email, plan, credits, etc.).
// - Zones à surveiller : changement de nom de clé localStorage, structure du user retourné.
//
// UTILISATION
// - Envelopper <App /> avec <AuthProvider> (souvent dans main.jsx).
// - Dans un composant :
//     const { user, setUser, loginSuccess, logout, loading } = useAuth();
// - 'loading' est true uniquement durant la vérification initiale (montage).
//
// SÉCURITÉ [BTZ-RISK]
// - Le token stocké dans localStorage est accessible au JS du navigateur : éviter d'exposer des infos sensibles côté front.
// - Prévoir une durée de vie côté backend et l'invalidation si besoin (rotations, revocation).
//
// ÉVOLUTIONS POSSIBLES (non implémentées ici, juste notes)
// - Rafraîchissement auto de l'utilisateur après loginSuccess (appel direct de me()).
// - Gestion d'expiration/refresh token (timer, silent refresh).
// - Synchronisation multi-tabs (via 'storage' event).
// ============================================================
import { createContext, useContext, useEffect, useState } from 'react';
import { me } from '../sdk/authApi'; // [BTZ] SDK front: appelle /api/me en utilisant le token stocké côté front

// [BTZ] Contexte brut + hook d'accès
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

/**
 * <AuthProvider>
 * - Fournit { user, setUser, loginSuccess, logout, loading } via Context.
 * - Au montage : si un token est présent en localStorage, tente de récupérer l'utilisateur via /api/me.
 */
export function AuthProvider({ children }) {
  // [BTZ] 'user' = objet utilisateur (ex. { email, credits, plan, ... })
  const [user, setUser] = useState(null);
  // [BTZ] 'loading' = indique que la vérification initiale du token est en cours
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // [BTZ] Au premier rendu, vérifier si un token existe déjà en storage
    const token = localStorage.getItem('apiKey');
    if (!token) { 
      // [BTZ] Cas: pas de token -> aucune requête /api/me à faire, on sort du mode "loading"
      setLoading(false); 
      return; 
    }
    // [BTZ] Un token existe -> tentative de récupérer l'utilisateur
    me()
      .then(setUser)                           // [BTZ] OK: on stocke l'objet user pour le reste de l'app
      .catch(() => localStorage.removeItem('apiKey')) // [BTZ] Token invalide/expiré: on le supprime pour éviter les boucles d'erreurs
      .finally(() => setLoading(false));       // [BTZ] Fin du cycle de vérification initiale (qu'il y ait eu succès ou erreur)
  }, []);

  /**
   * loginSuccess(token)
   * - À appeler juste après un /api/login réussi (back renvoie un token).
   * - Persistant: enregistre 'apiKey' dans localStorage pour les prochains rafraîchissements/page loads.
   * - Note: on peut choisir d'appeler me() ici pour charger l'utilisateur immédiatement (non imposé ici).
   */
  const loginSuccess = (token) => {
    localStorage.setItem('apiKey', token);
    // [BTZ] Option possible (non activée ici pour éviter effet de bord):
    // me().then(setUser).catch(() => localStorage.removeItem('apiKey'));
  };

  /**
   * logout()
   * - Déconnexion côté front: supprime 'apiKey' du localStorage et remet user à null.
   * - Ne fait pas d'appel réseau (adapter si un /api/logout est requis côté back).
   */
  const logout = () => {
    localStorage.removeItem('apiKey');
    setUser(null);
  };

  // [BTZ] Fourniture du contexte à tout l'arbre React
  return (
    <AuthCtx.Provider value={{ user, setUser, loginSuccess, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}
