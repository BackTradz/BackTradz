// src/pages/csvshop/helpers/csvshop.helpers.js
// ======================================================================
// Helpers CSVShop — pur JS (sans React)
// - EXCLUDED_TF : timeframes à masquer côté front
// - pickPreferredPair(candidates) : choix intelligent de la paire par défaut
// - normalizeLibraryRows(data) : normalise la réponse listCsvLibrary()
// - getApiTokenSafe() / withToken(url) : récup token & ajout paramètre
// ======================================================================

// TF à masquer côté front (mêmes valeurs qu'avant)
export const EXCLUDED_TF = new Set(["M1", "D", "D1"]);

/**
 * Choisit une paire par défaut : BTCUSD prioritaire, sinon une paire BTC-like,
 * sinon la 1re disponible.
 * @param {string[]} candidates
 * @returns {string}
 */
export function pickPreferredPair(candidates) {
  if (!candidates || candidates.length === 0) return "";
  const set = new Set(candidates.map((p) => String(p || "").toUpperCase()));
  if (set.has("BTCUSD")) return "BTCUSD";
  const btcish = candidates.find((p) => /BTC|XBT/i.test(p));
  if (btcish) return btcish;
  return candidates[0];
}

/**
 * Normalise la réponse de listCsvLibrary() en lignes homogènes.
 * @param {any} data
 * @returns {Array<{pair:string,timeframe:string,name:string,path:string,year:string,month:string,source:string}>}
 */
export function normalizeLibraryRows(data) {
  let rows = Array.isArray(data) ? data : (Array.isArray(data?.files) ? data.files : []);
  rows = rows.map((it) => ({
    pair: (it.pair || it.symbol || "").toUpperCase(),
    timeframe: (it.timeframe || it.tf || "").toUpperCase(),
    name: it.name || it.filename || "",
    path: it.path || it.relative_path || "",
    year: String(it.year || "").padStart(4, "0"),
    month: String(it.month || "").padStart(2, "0"),
    source: it.source || "output",
  }));
  return rows;
}

/** Token robuste : apiKey ou user.token (mêmes priorités qu'avant) */
export function getApiTokenSafe() {
  try {
    return (
      localStorage.getItem("apiKey") ||
      (JSON.parse(localStorage.getItem("user") || "{}")?.token) ||
      ""
    );
  } catch {
    return localStorage.getItem("apiKey") || "";
  }
}

/**
 * Ajoute ?token=… à une URL si le token existe.
 * @param {string} url
 * @returns {string}
 */
export function withToken(url) {
  const t = getApiTokenSafe();
  if (!t) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(t)}`;
}
