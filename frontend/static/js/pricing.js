// frontend/static/js/pricing.js

// 🔑 Vérifie qu’un token existe (auth utilisateur)
const token = localStorage.getItem("apiKey");
if (!token) window.location.href = "/login";
else {
  // Injecte le token dans un cookie si besoin (ex: pour Stripe)
  if (!document.cookie.includes("token=")) {
    document.cookie = `token=${token}; path=/; SameSite=Lax`;
  }
}

// ⚡ Déclenche un paiement Stripe
async function buyPlan(offerId) {
  const token = localStorage.getItem("apiKey");
  if (!token) {
    alert("Vous devez être connecté.");
    window.location.href = "/login";
    return;
  }

  try {
    const response = await fetch("/api/payment/stripe/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: offerId, user_token: token })
    });

    const data = await response.json();

    // ✅ Redirige vers la page de paiement Stripe
    if (data.url) window.location.href = data.url;
    else alert("Erreur : aucune URL Stripe reçue.");
  } catch (error) {
    console.error("Erreur Stripe:", error);
    alert("Échec de paiement.");
  }
}

// ⚡ Injection dynamique des boutons PayPal pour certaines offres
document.addEventListener("DOMContentLoaded", () => {
  const paypalPacks = ["CREDIT_5", "CREDIT_10", "CREDIT_20", "CREDIT_50"];

  paypalPacks.forEach(offerId => {
    const container = document.getElementById(`paypal-button-container-${offerId}`);
    if (!container) return;

    paypal.Buttons({
      style: { layout: 'horizontal', color: 'blue', shape: 'rect', label: 'paypal', height: 40 },

      // ✅ Crée un ordre PayPal
      createOrder: async () => {
        const res = await fetch("/api/payment/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offer_id: offerId, user_token: localStorage.getItem("apiKey") })
        });
        const dataRes = await res.json();
        return dataRes.id;
      },

      // ✅ Capture le paiement après validation
      onApprove: async (data) => {
        const token = localStorage.getItem("apiKey");
        const res = await fetch("/api/payment/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderID: data.orderID, offer_id: offerId, user_token: token })
        });

        const result = await res.json();
        if (result.status === "success") window.location.href = "/payment-success";
        else alert("Erreur: " + result.message);
      }
    }).render(container);
  });
});

// ⚡ Ajout boutons crypto (USDT par défaut)
document.querySelectorAll(".crypto-btn").forEach(btn => {
  if (getPriceForOffer(btn.dataset.offerId) < 10) {
    btn.style.display = "none"; // Cache les petits montants
    return;
  }

  btn.addEventListener("click", async function () {
    const offerId = btn.dataset.offerId;
    const token = localStorage.getItem("apiKey");
    if (!token) {
      alert("Vous devez être connecté.");
      window.location.href = "/login";
      return;
    }

    try {
      const res = await fetch("/api/payment/crypto/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, user_token: token, currency: "usdttrc20" })
      });

      if (!res.ok) {
        const errorText = await res.text();
        alert("Erreur paiement crypto :\n" + errorText);
        return;
      }

      const data = await res.json();
      if (data.payment_url) window.location.href = data.payment_url;
      else alert("Erreur : impossible de générer le paiement crypto.");
    } catch (e) {
      alert("Erreur lors de la création du paiement crypto.");
      console.error(e);
    }
  });
});

// 🔀 Toggle menu mobile
function toggleMenu() {
  document.getElementById("main-nav").classList.toggle("active");
}

// ⚖️ Récupère le prix selon l’offre et l’abonnement (-10% abonnés)
function getPriceForOffer(offerId) {
  const basePrices = { "CREDIT_5": 5.00, "CREDIT_10": 10.00, "CREDIT_20": 20.00, "CREDIT_50": 50.00 };
  const base = basePrices[offerId] || 5.00;

  const user = JSON.parse(localStorage.getItem("userData") || "{}");
  const plan = user.plan || "free";

  if (["SUB_9", "SUB_25"].includes(plan)) return (base * 0.9).toFixed(2);  // Réduction
  return base.toFixed(2);
}

// ⚡ Ajout Stripe sur clic bouton
document.querySelectorAll(".stripe-btn").forEach(btn => {
  btn.addEventListener("click", () => buyPlan(btn.dataset.offerId));
});

// ✅ Redirection profil
window.goProfile = function () {
  const token = localStorage.getItem("apiKey");
  if (!token) window.location.href = "/login";
  else window.location.href = `/profile?token=${token}`;
};
