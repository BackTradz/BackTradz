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

// PATCH BTZ V1.1 --- Base API détectée (supporte VITE_API_URL ou VITE_API_BASE) ---
const ENV_URL = (
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "")
    .trim()
    .replace(/\/+$/, "")
);
const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

// Règle:
// - Si ENV_URL défini → on l'utilise tel quel (prod ou dev).
// - Sinon:
//   - en local: BASE = "" (appels relatifs → passent par le proxy Vite /api)
//   - en prod:  BASE = https://api.backtradz.com
let BASE = ENV_URL || (isLocalhost ? "" : "https://api.backtradz.com");

// --- Join sûr BASE + path (gère BASE vide = appels relatifs) ---
const j = (path = "") => {
  const isAbs = /^https?:\/\//i.test(path);
  if (isAbs) return path;
  if (BASE === "") {
    return path.startsWith("/") ? path : `/${path}`;
  }
  return `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

// PATCH BTZ V1.1🔥 expose la base API (si vide => relative) + helper URL absolue
export const API_BASE = BASE;
export const absApi = (path) => {
  const p = String(path || "");
  if (/^https?:\/\//i.test(p)) return p;
  if (API_BASE === "") return p.startsWith("/") ? p : `/${p}`;
  return `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
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

  if (!res.ok) {
    // v1.2 — Si l'appel exige l'auth et que le serveur répond 401/403,
    // on redirige automatiquement vers la page de login avec "next" = URL courante.
    if (auth && (res.status === 401 || res.status === 403)) {
      try {
        const here = window.location.pathname + window.location.search + window.location.hash;
        const target = `/login?next=${encodeURIComponent(here)}`;
        // Évite boucle si déjà sur /login
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign(target);
        }
      } catch {}
    }
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }
  return data;
}
