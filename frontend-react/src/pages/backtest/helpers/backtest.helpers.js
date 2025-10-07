// src/pages/backtest/helpers/backtest.helpers.js
// ============================================================
// Helpers Backtest — pur JS (sans React)
// ------------------------------------------------------------
// - parseDateInput(s)
// - daysBetweenIncl(a, b)
// - collectParams(scope)
// ============================================================

/**
 * Parse "DD-MM-YYYY" / "DD/MM/YYYY" / "YYYY-MM-DD" en Date locale minuit.
 * Copie fidèle de la logique existante dans Backtest.jsx.
 * @param {string} s
 * @returns {Date|null}
 */
export function parseDateInput(s) {
  if (!s) return null;
  const str = String(s).trim();

  // DD-MM-YYYY ou DD/MM/YYYY
  const m = str.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  // YYYY-MM-DD
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    const [, yyyy, mm, dd] = m2;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  // Fallback (évite Invalid Date si navigateur parse autre format)
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

/**
 * Diff inclusif en jours, robuste DST (UTC).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function daysBetweenIncl(a, b) {
  const d1 = parseDateInput(a), d2 = parseDateInput(b);
  if (!d1 || !d2) return 0;
  const t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((t2 - t1) / 86400000) + 1;
}

/**
 * Collecte des paramètres dynamiques UI (scope="official|custom").
 * Reprend la logique querySelectorAll + data-attributes.
 * @param {"official"|"custom"} scope
 * @returns {Record<string, any>}
 */
export function collectParams(scope) {
  const nodes = document.querySelectorAll(`[data-scope='${scope}'][data-param='1']`);
  const obj = {};
  nodes.forEach((el) => {
    const key = el.name;
    if (!key) return;
    if (el.type === "checkbox") {
      obj[key] = el.checked;
    } else {
      if (el.value !== "") {
        // on laisse string; runBacktestMapped normalisera/castera côté SDK
        obj[key] = el.value;
      }
    }
  });
  return obj;
}
