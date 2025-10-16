// src/config/labels/params.map.js
// ============================================================
// Registre & normalisation GLOBALE des paramètres (front-only)
// - Conserve tes labels "friendly" côté UI si tu en utilises
// - Accepte aussi les clés backend direct (snake_case)
// - Normalise les alias problématiques (min_wait_candle → min_wait_candles)
// - Caste les types attendus (int/float/bool/str)
// - Peut filtrer sur la signature renvoyée par l'API (acceptedNames)
// ============================================================

// (Optionnel) Friendly -> backend (utile si tu as encore des clés UI lisibles)
export const ParamAliases = {
  // Fenêtres / attente
  minWait:                { internal: "min_wait_candles",       type: "int",   default: 3 },
  maxWait:                { internal: "max_wait_candles",       type: "int",   default: 20 },
  allowMulti:             { internal: "allow_multiple_entries", type: "bool",  default: false },

  // RSI
  rsiKey:                 { internal: "rsi_key",                type: "str",   default: "RSI" },
  rsiThreshold:           { internal: "rsi_threshold",          type: "float", default: 40.0 },

  // EMA
  emaFast:                { internal: "ema_fast",               type: "str",   default: "EMA_50" },
  emaSlow:                { internal: "ema_slow",               type: "str",   default: "EMA_200" },
  emaKey:                 { internal: "ema_key",                type: "str" },

  // FVG / OB
  minPips:                { internal: "min_pips",               type: "float" },
  maxTouch:               { internal: "max_touch",              type: "int"   },
  obSide:                 { internal: "ob_side",                type: "str"   },
  // Option UI (facultatif) — si jamais tu exposes un champ % côté UI:
  // overlapPct:          { internal: "min_overlap_ratio",      type: "float" },

  // Temps
  timeKey:                { internal: "time_key",               type: "str",   default: "time" },
  datetimeKey:            { internal: "Datetime",               type: "str"   },

  // Alias de secours (UI historiques)
  maxWaitBars:            { internal: "max_wait_candles",       type: "int"   },
  minWaitBars:            { internal: "min_wait_candles",       type: "int"   },
  multiEntries:           { internal: "allow_multiple_entries", type: "bool"  },
  rsiValue:               { internal: "rsi_threshold",          type: "float" },
  RSI:                    { internal: "rsi_key",                type: "str"   },
  ema1:                   { internal: "ema_fast",               type: "str"   },
  ema2:                   { internal: "ema_slow",               type: "str"   },
};

// Normalisation backend → backend canonique
const CanonicalKeyMap = {
  min_wait_candle: "min_wait_candles",  // ⟵ singulier → pluriel
  max_wait_candle: "max_wait_candles",
  RSI:             "rsi_key",
  ema1:            "ema_fast",
  ema2:            "ema_slow",
  Datetime:        "time_key",          // si jamais une colonne est envoyée au lieu de time_key
};

// Typage attendu des clés backend
const BackendTypeHints = {
  min_wait_candles:       "int",
  max_wait_candles:       "int",
  allow_multiple_entries: "bool",
  min_overlap_ratio:      "float",    // ⬅️ NEW: profondeur de retour (0.0–1.0)
  rsi_key:                "str",
  rsi_threshold:          "float",
  ema_key:                "str",
  ema_fast:               "str",
  ema_slow:               "str",
  min_pips:               "float",
  max_touch:              "int",
  ob_side:                "str",
  time_key:               "str",
};

// Cast simple
function castByType(value, type) {
  if (value === null || value === undefined) return value;
  if (type === "bool") {
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      return v === "true" || v === "1" || v === "yes";
    }
    return Boolean(value);
  }
  if (type === "int") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? undefined : parseInt(n, 10);
  }
  if (type === "float") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? undefined : n;
  }
  if (type === "str") return String(value);
  return value;
}

// Friendly → backend
function _remapFriendlyToInternal(uiValues = {}) {
  const out = {};
  for (const [uiKey, raw] of Object.entries(uiValues)) {
    const alias = ParamAliases[uiKey];
    if (!alias) continue;
    const casted = castByType(raw ?? alias.default, alias.type);
    if (casted === undefined) continue;
    out[alias.internal] = casted;
  }
  return out;
}

// Backend-ish → backend canonique + cast type
function _normalizeBackendishKeys(values = {}) {
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    const k2 = CanonicalKeyMap[k] || k;
    const typeHint = BackendTypeHints[k2];
    out[k2] = typeHint ? castByType(v, typeHint) : v;
  }
  return out;
}

/**
 * Unifie un objet de params (friendly + backend mélangés) vers des noms backend canoniques.
 * @param {object} uiValues   Clés UI et/ou backend
 * @param {string[]=} acceptedNames Noms backend acceptés par la stratégie (depuis /strategy_params)
 * @returns {object}          Clés backend propres et castées
 */
export function unifyParams(uiValues = {}, acceptedNames = null) {
  // a) conserve les clés snake_case existantes
  const backendPart = Object.fromEntries(
    Object.entries(uiValues).filter(([k]) => k.includes("_"))
  );
  // b) ajoute le mapping friendly
  const friendlyPart = _remapFriendlyToInternal(uiValues);
  // c) fusion
  const merged = { ...backendPart, ...friendlyPart };
  // d) normalisation (alias + cast)
  const normalized = _normalizeBackendishKeys(merged);
  // e) defaults (pour friendly jamais fournis)
  for (const [uiKey, alias] of Object.entries(ParamAliases)) {
    if (alias.default === undefined) continue;
    const k = alias.internal;
    if (!(k in normalized)) {
      normalized[k] = castByType(alias.default, alias.type);
    }
  }
  // f) filtre par signature si fournie
  if (Array.isArray(acceptedNames) && acceptedNames.length) {
    const filtered = {};
    for (const [k, v] of Object.entries(normalized)) {
      if (acceptedNames.includes(k)) filtered[k] = v;
    }
    return filtered;
  }
  return normalized;
}

// Alias de compat (si du code appelle encore "mapUiToInternal")
export const mapUiToInternal = (uiValues = {}, acceptedNames = null) =>
  unifyParams(uiValues, acceptedNames);

/**
 * getUiParamsSpec(strategyKey)
 * Petit helper pour l’UI (si besoin d’afficher/éditer des params "friendly").
 * Ici on expose la spec friendly globale ; si tu veux du par-stratégie,
 * tu peux filtrer/mapper ailleurs (ex: dans STRATEGIES_MAP).
 */
export function getUiParamsSpec(/* strategyKey */) {
  return Object.entries(ParamAliases).map(([uiName, def]) => ({
    uiName,
    label: def.label ?? uiName,
    default: def.default,
    type: def.type,
    internal: def.internal,
  }));
}

// ✅ Export default (pour labels.js qui fait un import par défaut)
const defaultExport = {
  ParamAliases,
  unifyParams,
  mapUiToInternal,
  getUiParamsSpec,
};
export default defaultExport;
