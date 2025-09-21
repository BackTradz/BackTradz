// src/sdk/paymentApi.js
import { api } from "./apiClient";

// Stripe : renvoie { url }
export const stripeSession = (offer_id) =>
  api("/api/payment/stripe/session", {
    method: "POST",
    body: { offer_id, user_token: localStorage.getItem("apiKey") },
  });

// PayPal : renvoie souvent { id }
export const paypalCreate = (offer_id) =>
  api("/api/payment/paypal/create-order", {
    method: "POST",
    body: { offer_id, user_token: localStorage.getItem("apiKey") },
  });

// Capture côté backend (si tu veux l'appeler après retour)
export const paypalCapture = (orderID, offer_id) =>
  api("/api/payment/paypal/capture-order", {
    method: "POST",
    body: { orderID, offer_id, user_token: localStorage.getItem("apiKey") },
  });

// --- BTZ-PATCH: token robuste pour init crypto ---
function getApiTokenSafe() {
  const k = localStorage.getItem("apiKey");
  if (k) return k;
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return u?.token || "";
  } catch { return ""; }
}
//-- CRYPTO 
export const cryptoOrder = (offer_id, currency = "usdttrc20") =>
  api("/api/payment/crypto/create-order", {
    method: "POST",
    body: { offer_id, user_token: getApiTokenSafe(), currency },
  });


  // Vérifie la session Stripe après redirection (pas de webhook en local)
export const stripeConfirm = (session_id) =>
  api("/api/payment/stripe/confirm", {
    method: "POST",
    body: { session_id },
  });
