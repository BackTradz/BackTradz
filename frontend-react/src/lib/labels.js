// [CHANGE: 2025-09-04] Helpers globaux pour formater clés backend en labels UX
import STRATEGIES_MAP from "../config/labels/strategies.map";
import PARAMS_MAP from "../config/labels/params.map";
import PAIRS_MAP from "../config/labels/pairs.map";

/* Transforme un objet {key: {label}} en options {value,label} triées */
export function toOptions(mapObj, { sort = true } = {}) {
  const arr = Object.entries(mapObj).map(([value, meta]) => ({
    value,
    label: meta?.label || value,
  }));
  if (sort) arr.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return arr;
}

/* Formatters (fallback sur clé brute) */
export const formatStrategy = (key) =>
  STRATEGIES_MAP[key]?.label || key || "—";

export const formatPair = (key) =>
  PAIRS_MAP[key]?.label || key || "—";

export const formatParam = (key, { strategyKey } = {}) =>
  STRATEGIES_MAP[strategyKey]?.paramsOverride?.[key]
  || PARAMS_MAP[key]?.label
  || key;

/* Tooltips / types (si besoin plus tard dans les forms) */
export const formatParamHelp = (key) => PARAMS_MAP[key]?.help || "";
export const formatParamType = (key) => PARAMS_MAP[key]?.type || "text";

/* Options pour <Select> front */
export const strategyOptions = () => {
  const raw = Object.fromEntries(
    Object.entries(STRATEGIES_MAP).map(([k, v]) => [k, { label: v.label }])
  );
  return toOptions(raw);
};

export const pairOptionsFromMap = () => toOptions(PAIRS_MAP);

/* Utilitaire pour re-labelliser une liste brute ["EURUSD","GC=F"] en options */
export function pairsToOptions(pairs) {
  const uniq = Array.from(new Set((pairs || []).filter(Boolean)));
  const opts = uniq.map((p) => ({ value: p, label: formatPair(p) }));
  opts.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return [{ value: "ALL", label: "Toutes" }, ...opts];
}
