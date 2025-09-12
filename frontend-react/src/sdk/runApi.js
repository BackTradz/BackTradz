// runApi.js (ajouts)
// ============================================================
// On conserve tes fonctions existantes (listStrategies, strategyParams, runBacktestOfficial, etc.)
// et on AJOUTE une fonction utilitaire "runBacktestMapped" qui:
//   - récupère la signature (noms internes acceptés) via /api/strategy_params/{name}
//   - unifie les params (friendly/backend) avec normalisation min_wait_candle -> min_wait_candles, etc.
//   - envoie le payload final propre à /api/run_backtest
// ============================================================
import { api } from './apiClient';
import { unifyParams } from '../config/labels/params.map';

export const listStrategies = () => api('/api/list_strategies', { auth:false });

export const strategyParams = (name) =>
  api(`/api/strategy_params/${name}`, { auth:false });

export const runBacktestOfficial = (payload) =>
  api('/api/run_backtest', { method:'POST', body: payload });

export const runBacktestCustom = (formData) =>
  api('/api/upload_csv_and_backtest', { method:'POST', body: formData });

export const listOutputBacktestFiles = () =>
  api('/api/list_output_backtest_files', { auth:false });

/**
 * runBacktestMapped(uiPayload)
 * uiPayload: {
 *   strategy: "<backendKey>",         // ex: "ob_pullback_gap_tendance_ema_rsi" (depuis ton select)
 *   params: { ... },                  // clés UI mélangées (ex: min_wait_candle OU min_wait_candles, RSI, ema1/ema2…)
 *   sl_pips, tp1_pips, tp2_pips,
 *   symbol, timeframe, start_date, end_date, auto_analyze
 * }
 *
 * Effet: on envoie à /api/run_backtest un payload avec SEULEMENT les noms internes valides.
 */

// ========= PATCH A: mapping/typing/filter avant POST =========

// petit cast local
function __castByType(value, type) {
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

// clés backend canoniques (on corrige les variantes UI)
const __CanonicalKeyMap = {
  min_wait_candle: "min_wait_candles",       // 👈 SINGULIER ➜ PLURIEL
  max_wait_candle: "max_wait_candles",
  RSI:              "rsi_key",
  ema1:             "ema_fast",
  ema2:             "ema_slow",
};

// hints de typage pour caster correctement
const __BackendTypeHints = {
  min_wait_candles:       "int",
  max_wait_candles:       "int",
  allow_multiple_entries: "bool",
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

// normalise les clés snake_case (déjà backend-ish)
function __normalizeBackendish(params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    const k2 = __CanonicalKeyMap[k] || k;
    const hint = __BackendTypeHints[k2];
    out[k2] = hint ? __castByType(v, hint) : v;
  }
  return out;
}

// charge la signature backend
async function __fetchStrategyParams(name) {
  const res = await fetch(`/api/strategy_params/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Failed strategy_params for ${name}`);
  const data = await res.json();
  return Array.isArray(data?.parameters) ? data.parameters.map(p => p.name) : [];
}

// public: lance un run avec mapping propre
export async function runBacktestMapped(uiPayload) {
  const name = uiPayload?.strategy;
  if (!name) throw new Error("Missing 'strategy' backend key");

  // 1) noms acceptés par la strat (filtre)
  let accepted = [];
  try { accepted = await __fetchStrategyParams(name); }
  catch (e) { console.warn("signature not loaded; continue:", e); }

  // 2) on part de ce que l’UI a (souvent déjà des clés backend)
  const normalized = __normalizeBackendish(uiPayload?.params || {});

  // 3) filtre par signature (si connue)
  const cleanParams = (accepted.length)
    ? Object.fromEntries(Object.entries(normalized).filter(([k]) => accepted.includes(k)))
    : normalized;

  // 4) payload final
  const body = {
    strategy: name,
    params: cleanParams,
    sl_pips: uiPayload.sl_pips,
    tp1_pips: uiPayload.tp1_pips,
    tp2_pips: uiPayload.tp2_pips,
    symbol: uiPayload.symbol,
    timeframe: uiPayload.timeframe,
    start_date: uiPayload.start_date,
    end_date: uiPayload.end_date,
    auto_analyze: uiPayload.auto_analyze ?? false,
  };

  // debug utile: vérifie que tes valeurs UI passent bien
  console.log("📦 Payload envoyé /run_backtest:", body);

  return await runBacktestOfficial(body);
}
