/**
 * login.js
 * --------
 * Rôle : gère le formulaire de connexion + le retour OAuth Google.
 *  - Soumet {identifier, password} à /api/login (JSON).
 *  - Stocke le token en localStorage sous "apiKey".
 *  - Redirige vers /dashboard après succès (même flux pour Google).
 *
 * Hypothèses DOM:
 *  - #loginForm          : <form> classique avec inputs #identifier, #password
 *
 * Notes:
 *  - En cas d'échec, affiche un alert() (minimaliste mais efficace).
 *  - Les routes backend sont en /api/...
 */

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const identifier = document.getElementById("identifier").value;
  const password = document.getElementById("password").value;

  const payload = { identifier, password };

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.token) {
      // ✅ Stocke le token pour les pages protégées
      localStorage.setItem("apiKey", result.token);
      // Redirige vers le dashboard utilisateur
      window.location.href = "/dashboard";
    } else {
      alert("❌ Échec de connexion : " + (result.message || "Identifiants invalides"));
    }
  } catch (err) {
    alert("❌ Erreur serveur : " + err.message);
  }
});

// 🔁 Google OAuth: check du retour ?token=<uuid> dans l'URL
const urlParams = new URLSearchParams(window.location.search);
const tokenFromGoogle = urlParams.get("token");

if (tokenFromGoogle) {
  localStorage.setItem("apiKey", tokenFromGoogle);
  window.location.href = "/dashboard";
}
