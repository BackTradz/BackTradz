import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import "./index.css";


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
