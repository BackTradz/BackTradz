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

// --- Détection contexte
const onProdDomain =
  typeof window !== "undefined" &&
  /(^|\.)backtradz\.com$/i.test(window.location.hostname);

// --- Base URL issue de l'env (si présente)
const envBase = (import.meta.env?.VITE_API_BASE || "").trim();

// --- Si on est en prod et que l'env pointe sur localhost → on l'ignore
const looksLikeLocal = /localhost|127\.0\.0\.1|:\d{2,5}/i.test(envBase);
const effectiveBase = onProdDomain && looksLikeLocal ? "" : envBase;

// --- Join sûr BASE + path
const j = (path = "") => {
  const isAbs = /^https?:\/\//i.test(path);
  if (isAbs) return path;
  return `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};
// 🔥 expose la base API pour construire des HREF absolus (téléchargements)
export const API_BASE = BASE;
export const absApi = (path) => {
  const p = String(path || "");
  return /^https?:\/\//i.test(p) ? p : `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
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
