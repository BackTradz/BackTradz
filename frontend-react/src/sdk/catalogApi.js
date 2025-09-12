// ============================================================
// catalogApi.js
// ------------------------------------------------------------
// RÔLE : appels pour la boutique CSV (listing + download).
// TES ROUTES (backend) :
// - GET /api/list_csv_library
// - GET /api/list_output_backtest_files      (déjà utilisé par Backtest)
// - GET /api/download_csv_by_path/{relative_path} (URL directe)
// ============================================================

// src/sdk/catalogApi.js
import { api } from "./apiClient";

// Bibliothèque CSV (officielle)
export const listCsvLibrary = () => api("/api/list_csv_library", { auth: false });

// Sorties connues (pour pairs/timeframes – déjà utilisées pour Backtest)
export const listOutputBacktestFiles = () =>
  api("/api/list_output_backtest_files", { auth: false });

// URL de téléchargement d'un CSV par "relative_path"
export const downloadCsvByPathUrl = (relativePath) => {
  let rel = String(relativePath).replaceAll("\\", "/");
  if (rel.toLowerCase().startsWith("backend/")) {
    rel = rel.substring(8); // coupe "backend/"
  }
  return `/api/download_csv_by_path/${rel}`;
};

// Extractions récentes (TTL 48h) pour l'utilisateur courant
export const myRecentExtractions = () => api("/api/my_recent_extractions");
