import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import "./index.css";

// 🔗 Route tous les appels '/api/*' vers l'API en conservant le préfixe /api
(function patchFetchBaseURL() {
  try {
    const RAW  = (import.meta.env.VITE_API_URL || "https://api.backtradz.com/api").trim().replace(/\/+$/, "");
    const BASE = /\/api$/i.test(RAW) ? RAW : RAW + "/api";  // ✅ force terminaison par /api
    const _fetch  = window.fetch.bind(window);
    const ORIGIN = window.location.origin.replace(/\/+$/, "");

    window.fetch = (input, init) => {
      try {
        let url = typeof input === "string" ? input : input?.url;
        // 1) appels relatifs '/api/...'
        if (typeof url === "string" && url.startsWith("/api/")) {
          const rewritten = BASE + url;                 // ✅ on NE retire plus /api
          input = typeof input === "string" ? rewritten : new Request(rewritten, input);
        }
        // 2) appels absolus depuis le front 'https://www.backtradz.com/api/...'
        else if (typeof url === "string" && url.startsWith(ORIGIN + "/api/")) {
          const tail = url.slice(ORIGIN.length);        // conserve '/api/...'
          const rewritten = BASE + tail;
          input = typeof input === "string" ? rewritten : new Request(rewritten, input);
        }
      } catch {}
      return _fetch(input, init);
    };
    window.__API_BASE__ = BASE;
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
