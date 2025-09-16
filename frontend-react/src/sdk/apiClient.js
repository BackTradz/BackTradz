// ============================================================
// apiClient.js
// ------------------------------------------------------------
// RÔLE :
// - Centraliser les appels réseau (fetch)
// - Ajouter automatiquement le header d'auth "X-API-Key" si on a un token
// - Gérer le JSON (et fallback en texte si pas du JSON)
// - Lever une erreur JS si la réponse HTTP n'est pas 2xx
//
// UTILISATION :
// import { api } from './apiClient'
// const data = await api('/api/me')                 // GET
// const data = await api('/api/login', { method:'POST', auth:false, body:{...} })
//
// NOTES :
// - En DEV : VITE_API_BASE doit pointer sur http://127.0.0.1:8000 (ou proxy Vite).
// - En PROD (Render) : fallback automatique vers https://api.backtradz.com
// - Si "body" est un objet => JSON ; si FormData => on laisse tel quel.
// ============================================================

const BASE = (
  import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.trim()
    ? import.meta.env.VITE_API_BASE.trim().replace(/\/$/, '')
    : 'https://api.backtradz.com' // ✅ fallback PROD sûr
);

/** Join sûr BASE + path (gère les slashs) */
const j = (path) => {
  if (!path) return BASE;
  const isAbsolute = /^https?:\/\//i.test(path);
  if (isAbsolute) return path;
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

export async function api(path, { method = 'GET', headers = {}, body, auth = true } = {}) {
  // 🔐 Token déjà stocké au login
  const token = localStorage.getItem('apiKey');

  // 📨 Headers
  const h = { ...(headers || {}) };
  if (auth && token) h['X-API-Key'] = token;           // ✅ conforme à ton backend
  if (body && !(body instanceof FormData)) h['Content-Type'] = 'application/json';

  // 🚀 Appel HTTP
  const res = await fetch(j(path), {
    method,
    headers: h,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });

  // 📦 Lecture + parsing souple
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }

  // ❌ Erreurs HTTP → throw
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }

  return data;
}
