/**
 * home.js
 * -------
 * Rôle : logique de la page d'accueil une fois connecté.
 *  - Vérifie la présence d'un token (redirige sinon).
 *  - Affiche le TOP des stratégies depuis /api/public/top_strategies.
 *  - Fournit utilitaires: go(page), logout(), goProfile(), toggleMenu().
 *
 * Hypothèses DOM:
 *  - .strategy-grid : conteneur des cartes "top stratégies".
 *  - #main-nav      : nav responsive (classe .active pour l'ouvrir).
 */

const token = localStorage.getItem("apiKey");
if (!token) window.location.href = "/login";

/** Ouvre un lien dans un nouvel onglet (boutons "découvrir", etc.) */
function go(page) {
  window.open(page, "_blank");
}

/** Déconnexion simple: supprime la clé et revient à l'accueil publique */
function logout() {
  localStorage.removeItem("apiKey");
  window.location.href = "/";
}

// 🚀 Charger les tops dynamiquement
fetch("/api/public/top_strategies")
  .then(res => res.json())
  .then(data => {
    const container = document.querySelector(".strategy-grid");
    container.innerHTML = "";

    data.forEach(strat => {
      const card = document.createElement("div");
      card.className = "strategy-card";
      card.innerHTML = `
        <h3>${strat.name}</h3>
        <p>Paire : ${strat.symbol} (${strat.timeframe})</p>
        <p>Période : ${strat.period}</p>
        <p>Winrate : <strong>${strat.winrate}%</strong></p>
      `;
      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error("Erreur chargement des tops :", err);
    // Optionnel: afficher un message de fallback dans .strategy-grid
  });

/** Redirection vers la page profil en passant le token en query */
function goProfile() {
  const token = localStorage.getItem("apiKey");
  if (!token) {
    window.location.href = "/login";
    return;
  }
  window.location.href = `/profile?token=${token}`;
}

/** Ouvre/ferme le menu principal (mobile) */
function toggleMenu() {
  const nav = document.getElementById("main-nav");
  nav.classList.toggle("active");
}
