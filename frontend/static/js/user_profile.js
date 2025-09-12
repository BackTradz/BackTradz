/**
 * user_profile.js
 * ---------------
 * Rôle : page Profil Utilisateur.
 * - Charge l’utilisateur (/api/me) pour préremplir formulaire + afficher crédits / plan.
 * - Rendu d’un historique d’achats lisible (avec tooltip).
 * - Actions : update profil, delete account, unsubscribe, logout.
 *
 * ⚠️ Attention aux entêtes & formats :
 *   • Le backend `user_profile_routes.py`:
 *       - GET /profile?token=... (page, public)
 *       - POST /profile/update   → attend Header X-API-Key **ET** form-data (email, full_name, password?)
 *       - POST /profile/delete   → Header X-API-Key (JSON OK)
 *       - POST /profile/unsubscribe → Header X-API-Key
 *   • Ici, /profile/update envoie du JSON + header "Authorization": token.
 *     → ça ne match pas le backend actuel (voir commentaires inline "⚠️").
 */

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("apiKey");
  if (!token) return window.location.href = "/login";

  const res = await fetch("/api/me", {
    headers: { "X-API-Key": token }
  });

  const user = await res.json();
  console.log("🧠 DEBUG USER:", user);

  const historyBlock = document.getElementById("purchaseList");
  console.log("🧾 Historique brut :", user.purchase_history);

  if (user.purchase_history && user.purchase_history.length > 0) {
    // Trie anti-chronologique
    const sorted = user.purchase_history.sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(p => {
      const method = p.method || "inconnu";
      const date = new Date(p.date).toLocaleString("fr-FR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });

      const offerId = p.offer_id || "-";
      const credits = p.credits_added !== undefined ? p.credits_added : "-";
      const discount = p.discount_applied && p.discount_applied !== "0%" ? p.discount_applied : "Aucune";

      const isRenewal = method === "auto_renew";
      const type = offerId.startsWith("SUB_")
        ? (isRenewal ? "Crédits mensuels" : "Abonnement")
        : "Crédits";

      const price = p.price_paid === 0 || p.price_paid === "0.0" || p.price_paid === "0.00" ? "Gratuit" : `${p.price_paid}€`;
      const displayMethod = isRenewal ? "Renouvellement auto" : method;

      const tooltipText = `
        💳 Méthode : ${displayMethod}
        📦 Offre : ${offerId}
        🪙 Crédits ajoutés : ${credits}
        💸 Réduction : ${discount}
        🕒 Date : ${date}`.trim();

      const li = document.createElement("li");
      li.classList.add("tooltip-wrapper");
      li.style.marginBottom = "0.6rem";
      li.innerHTML = `
        🟢 <strong>${price}</strong> – ${type} <code>${offerId}</code> <em>via ${displayMethod}</em>
        <div class="tooltip-content">${tooltipText}</div>
      `;
      historyBlock.appendChild(li);
    });

  } else {
    historyBlock.innerHTML = "<li style='color:gray;'>Aucun achat enregistré.</li>";
  }

  // Préremplissage des champs de profil
  document.getElementById("first_name").value = user.first_name || "";
  document.getElementById("last_name").value = user.last_name || "";
  document.getElementById("email").value = user.email || "";
  document.getElementById("username").value = user.username || "";
  document.getElementById("usernameDisplay").textContent = user.username;

  // Infos d'abonnement (affichage)
  document.getElementById("planType").textContent = user.plan || "Gratuit";
  const discountLabel = document.getElementById("discountLabel");
  if (["SUB_9", "SUB_25"].includes(user.plan)) {
    discountLabel.style.display = "block";
  }

  document.getElementById("credits").textContent = user.credits ?? "0";
});


// ✅ Soumission du formulaire profil
document.getElementById("profileForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const token = localStorage.getItem("apiKey");
  const payload = {
    first_name: document.getElementById("first_name").value,
    last_name: document.getElementById("last_name").value,
    email: document.getElementById("email").value
  };

  /**
   * ⚠️ Incohérence potentielle :
   *   - Backend `user_profile_routes.py` → /profile/update attend Header X-API-Key
   *     et **form-data** (email, full_name, password?).
   *   - Ici → envoi JSON + header "Authorization".
   *   - Si ça marche chez toi, c’est que le backend tolère encore ce flux.
   *   - Sinon : adapter en form-data + "X-API-Key" côté headers.
   */
  const response = await fetch("/profile/update", {
    method: "POST",
    headers: {
      "Authorization": token,     // ⚠️ backend attend plutôt X-API-Key
      "Content-Type": "application/json" // ⚠️ backend attend du form-data
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  const msg = document.getElementById("responseMessage");
  msg.textContent = result.status === "success"
    ? "✅ Profil mis à jour avec succès."
    : "❌ Erreur : " + (result.message || "Inconnue");
  msg.style.color = result.status === "success" ? "#00ffaa" : "red";
});

// 🗑️ Suppression du compte
document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
  if (!confirm("⚠️ Supprimer ton compte est irréversible. Tu veux vraiment continuer ?")) return;

  const token = localStorage.getItem("apiKey");

  const response = await fetch("/profile/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": token  // ← Auth ici OK (backend attend X-API-Key)
    }
  });

  const result = await response.json();
  if (result.status === "success") {
    alert("✅ Ton compte a été supprimé.");
    localStorage.removeItem("apiKey");
    window.location.href = "/login";
  } else {
    alert("❌ Erreur : " + (result.message || "Échec de la suppression."));
  }
});

// 🚫 Désabonnement
document.getElementById("unsubscribeBtn").addEventListener("click", async () => {
  if (!confirm("⛔ Tu veux vraiment te désabonner ? Tu perdras les avantages liés à l'abonnement.")) return;

  const token = localStorage.getItem("apiKey");
  const response = await fetch("/profile/unsubscribe", {
    method: "POST",
    headers: { "X-API-Key": token }   // ← Auth ici OK
  });

  const result = await response.json();
  if (result.status === "success") {
    alert("✅ Abonnement annulé.");
    window.location.reload();
  } else {
    alert("❌ Erreur : " + (result.message || "Échec de l’annulation."));
  }
});

/** Ouvre/ferme le menu principal (mobile) */
function toggleMenu() {
  const nav = document.getElementById("main-nav");
  nav.classList.toggle("active");
}

// 👉 Toggle de l'historique d'achats (afficher/masquer)
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const purchaseContainer = document.getElementById("purchaseContainer");

toggleHistoryBtn.addEventListener("click", () => {
  console.log("clic");
  const isVisible = purchaseContainer.style.display === "block";
  purchaseContainer.style.display = isVisible ? "none" : "block";
  toggleHistoryBtn.innerHTML = isVisible
    ? "📁 Afficher l’historique des achats"
    : "📂 Masquer l’historique des achats";
});

// 🚪 Déconnexion
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("apiKey");
  window.location.href = "/login";
});
