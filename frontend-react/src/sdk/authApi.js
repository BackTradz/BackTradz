// ============================================================
// authApi.js
// ------------------------------------------------------------
// RÔLE : regrouper les appels d'authentification existants.
// TES ROUTES (backend) :
// - POST /api/login         -> { token, ... }
// - POST /api/register      -> { token, ... } (optionnel pour la suite)
// - GET  /api/me            -> infos utilisateur connecté
// ============================================================
import { api } from './apiClient';

export const login    = (identifier, password) =>
  api('/api/login', { method:'POST', auth:false, body:{ identifier, password } });

export const register = (payload) =>
  api('/api/register', { method:'POST', auth:false, body: payload });

export const me       = () =>
  api('/me'); // // header X-API-Key ajouté automatiquement par apiClient

// 🔗 Vérification email (GET avec token en query)
export const verifyEmail = (token) =>
  api(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { auth: false });

// 🔁 Renvoyer un lien de vérif (authed)
export const resendVerification = () =>
  api('/api/auth/resend-verification', { method: 'POST' });