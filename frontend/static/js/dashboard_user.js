// dashboard_user.js
// -----------------
// Rôle : afficher les backtests de l'utilisateur connecté + ses crédits.
// - Cherche le token dans l'URL (retour Google) puis fallback sur localStorage.
// - Appelle /api/user/backtests et /api/me.
// - Propose un download du .xlsx lié au backtest.
// - Gère aussi le menu et un raccourci vers le profil.
//
// Hypothèses DOM :
// - #backtest-list  : conteneur des cartes backtest
// - #credit-count   : badge/texte affichant les crédits restants
// - #main-nav       : menu burger responsive

// ✅ Récupère le token depuis l'URL ou localStorage
function getTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("token");
}

let token = getTokenFromURL();
if (token) {
  // ✅ Sauvegarde dans localStorage si vient de Google
  localStorage.setItem("apiKey", token);
} else {
  // 🔄 Sinon essaye de le prendre depuis localStorage
  token = localStorage.getItem("apiKey");
}

// ❌ Si toujours rien, redirige
if (!token) {
  window.location.href = "/login";
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ JS LOADED"); // <== Ajoute ça
  const token = localStorage.getItem("apiKey"); // ✅ FIX ICI
  const container = document.getElementById("backtest-list");

  if (!token) {
    alert("❌ Token manquant. Veuillez vous connecter.");
    window.location.href = "/login";
  }

  try {
    console.log(
      "📡 Envoi requête GET /api/user/backtests avec token :",
      token
    ); // 🔍 DEBUG

    const res = await fetch("/api/user/backtests", {
      headers: { "X-API-Key": token },
    });

    console.log("📨 Réponse reçue :", res); // 🔍 DEBUG

    const data = await res.json();
    console.log("📊 Données JSON :", data); // 🔍 DEBUG

    // 🎛️ Pour chaque backtest → crée une carte simple avec les infos principales
    data.forEach((bt) => {
      const div = document.createElement("div");
      div.className = "backtest-card";
      const info = `
                <h3>${bt.symbol} • ${bt.timeframe}</h3>
                <p><strong>Stratégie :</strong> ${bt.strategy}</p>
                <p><strong>Période :</strong> ${bt.period}</p>
                <p><strong>Winrate TP1 :</strong> ${bt.winrate || "N/A"}</p>

            `;

      // Lien de téléchargement de l’analyse XLSX (fourni par /user/backtests)
      const download = document.createElement("a");
      download.href = `/api/download/${bt.xlsx_filename}`; // ✅ FIX FONDAMENTAL
      download.innerText = "📥 Télécharger .xlsx";
      download.className = "download-btn";

      div.innerHTML = info;
      div.appendChild(download);
      container.appendChild(div);
    });
  } catch (e) {
    container.innerHTML = "<p>❌ Erreur lors du chargement du dashboard.</p>";
    console.error(e);
  }
});

/**
 * Charge les crédits du user connecté et les affiche dans #credit-count.
 */
async function loadCredits() {
  const token = localStorage.getItem("apiKey");
  const res = await fetch("/api/me", {
    headers: { "X-API-Key": token },
  });

  if (res.ok) {
    const data = await res.json();
    document.getElementById("credit-count").textContent = data.credits;
  } else {
    document.getElementById("credit-count").textContent = "Erreur";
  }
}
loadCredits();

/** Ouvre/ferme le menu principal (mobile) */
function toggleMenu() {
  const nav = document.getElementById("main-nav");
  nav.classList.toggle("active");
}

// ✅ Ajout de la redirection vers le profil (bouton/header → goProfile())
window.goProfile = function () {
  const token = localStorage.getItem("apiKey");
  if (!token) {
    window.location.href = "/login";
  } else {
    window.location.href = `/profile?token=${token}`;
  }
};
