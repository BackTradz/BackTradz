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
// NOTE :
// - Si "body" est un objet => on envoie JSON (Content-Type: application/json)
// - Si "body" est une FormData => on laisse le navigateur gérer (pas de Content-Type fixé)
// ============================================================

export async function api(path, { method = 'GET', headers = {}, body, auth = true } = {}) {
  // Récupère le token stocké côté navigateur (déjà géré par le login)
  const token = localStorage.getItem('apiKey');

  // Copie les headers et ajoute ce qui manque
  const h = { ...(headers || {}) };

  // Si le call nécessite une auth et qu'on a un token, on ajoute X-API-Key
  if (auth && token) h['X-API-Key'] = token;

  // Si body est un objet simple (pas FormData), on l'envoie en JSON
  if (body && !(body instanceof FormData)) h['Content-Type'] = 'application/json';

  
   // 🔧 Résolution d'URL
  const BASE = import.meta.env.VITE_API_BASE || ''; // ex: http://127.0.0.1:8000 ou https://api.BackTradz.com
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : (BASE ? `${BASE}${path}` : path);

  // Lance la requête HTTP (fetch)
  const res = await fetch(url, {
    method,
    headers: h,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });

  // Lis la réponse (texte brut d'abord)
  const text = await res.text();

  // Essaie de parser en JSON ; si échec, renvoie un objet { raw: texte }
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }

  // Si HTTP non "ok" (ex: 400/401/500), on lève une erreur JS avec message utile
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }

  // Retourne la donnée (objet JS)
  return data;
}
