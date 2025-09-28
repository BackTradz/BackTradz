// components/admin/AdminInsightsOverlay.jsx
import React from "react";
import BacktestInsightsOverlay from "../../../components/overlay/BacktestInsightsOverlay";

/**
 * AdminInsightsOverlay
 * ------------------------------------------------------------------
 * 🧩 Façade admin qui réutilise le composant générique d’insights XLSX.
 * - On transmet simplement toutes les props.
 * - Aucun comportement additionnel côté admin (DRY).
 *
 * ⚠️ [BTZ-DEPLOY]
 * - S’assurer que "../overlay/BacktestInsightsOverlay" est présent et exporte un composant compatible.
 */
export default function AdminInsightsOverlay(props) {
  // on ne change rien : on réutilise l’overlay “vrai” (XLSX)
  return <BacktestInsightsOverlay {...props} />;
}
