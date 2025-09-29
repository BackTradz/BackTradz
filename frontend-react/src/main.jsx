import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import "./index.css";
import './analytics/posthog';
import { startReplayIfAllowed } from './analytics/posthog';

// 🔗 Route tous les appels '/api/*' vers l'API (sans jamais doubler /api)
(function patchFetchBaseURL() {
  try {
    // ✅ En local: rester sur la même origine (localhost:5174) -> passe par proxy Vite
    // ✅ En prod: fallback vers api.backtradz.com (ou VITE_API_URL si fourni)
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    const ENV     = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
    const DEFAULT = isLocal ? window.location.origin : "https://api.backtradz.com";
    const ROOT    = (ENV || DEFAULT).replace(/\/api$/i, "");   // base SANS /api
    const _fetch = window.fetch.bind(window);
    const ORIGIN = window.location.origin.replace(/\/+$/, "");

    window.fetch = (input, init) => {
      try {
        let url = typeof input === "string" ? input : input?.url;
        // 1) appels relatifs '/api/...'
        if (typeof url === "string" && url.startsWith("/api/")) {
          const rewritten = ROOT + url;               // ex: ROOT + '/api/xyz'
          input = typeof input === "string" ? rewritten : new Request(rewritten, input);
        }
        // 2) appels absolus vers le front 'https://www.backtradz.com/api/...'
        else if (typeof url === "string" && url.startsWith(ORIGIN + "/api/")) {
          const tail = url.slice(ORIGIN.length);      // garde '/api/...'
          const rewritten = ROOT + tail;
          input = typeof input === "string" ? rewritten : new Request(rewritten, input);
        }
      } catch {}
      return _fetch(input, init);
    };
    // Pour debug éventuel
    window.__API_BASE__ = ROOT + "/api";
  } catch {}
})();

// main.jsx
const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get("apiKey");
if (apiKey) {
  localStorage.setItem("apiKey", apiKey);
  // Nettoyage visuel de l'URL (facultatif)
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// 🔁 (re)lance/stop le replay sur navigation
window.addEventListener('load', () => startReplayIfAllowed(location.pathname));
window.addEventListener('popstate', () => startReplayIfAllowed(location.pathname));
(() => {
  const _pushState = history.pushState;
  history.pushState = function () {
    _pushState.apply(this, arguments);
    startReplayIfAllowed(location.pathname);
  };
})();