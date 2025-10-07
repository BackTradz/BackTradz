// src/pages/backtest/hooks/useProgressETA.js
// ============================================================
// Hook pour gérer la progression "réelle estimée" + ETA.
// ------------------------------------------------------------
// Fournit: { progress, showProgress, etaSeconds, begin, finish }.
// - begin(): démarre la progression et l'estimation
// - finish(): termine la progression et persiste la durée observée
// ============================================================
import { useRef, useState } from "react";

// Utilitaires locaux (copie fidèle de Backtest.jsx)
const loadEtaHist = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
};
const saveEtaHist = (key, arr) => {
  try { localStorage.setItem(key, JSON.stringify(arr.slice(-15))); } catch {}
};
const median = (arr) => {
  if (!arr?.length) return null;
  const a = [...arr].sort((x,y)=>x-y);
  const i = Math.floor(a.length/2);
  return a.length%2 ? a[i] : Math.round((a[i-1]+a[i])/2);
};

/**
 * @param {() => string} makeEtaKey - fonction qui renvoie une clé du type:
 *   "bt_eta::<strategy>::<symbol>::<timeframe>::<days>"
 */
export default function useProgressETA(makeEtaKey) {
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const _timerRef = useRef(null);
  const _t0Ref = useRef(0);
  const _etaRef = useRef(8000); // estimation ms (par défaut 8s, ajustée ensuite)

  const begin = () => {
    const key = makeEtaKey?.() || "bt_eta::default";
    const hist = loadEtaHist(key);
    const med = median(hist);
    // Heuristique douce si pas d’historique: 6s + 0.25s/jour, bornée
    const parts = key.split("::");
    const days = Number(parts[parts.length - 1]) || 1;
    const guess = Math.min(45000, Math.max(4000, 6000 + days*250));
    _etaRef.current = med ? Math.min(60000, Math.max(3000, med)) : guess;

    _t0Ref.current = performance.now();
    setShowProgress(true);
    setProgress(1);
    setEtaSeconds(Math.ceil(_etaRef.current / 1000));

    if (_timerRef.current) clearInterval(_timerRef.current);
    _timerRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - _t0Ref.current;
      if (elapsed <= _etaRef.current) {
        const raw = (elapsed / _etaRef.current) * 100;
        const next = Math.max(1, Math.min(98, Math.round(raw)));
        // progression monotone (ne redescend jamais)
        setProgress((prev) => Math.max(prev, next));
        const remaining = Math.max(0, Math.ceil((_etaRef.current - elapsed) / 1000));
        setEtaSeconds(remaining);
      } else {
        // dépassement de l'estimation → converge lentement vers 99%
        setProgress((prev) => Math.min(99, prev + 0.5));
        setEtaSeconds(0);
      }
    }, 200);
  };

  const finish = () => {
    if (_timerRef.current) { clearInterval(_timerRef.current); _timerRef.current = null; }
    const realMs = Math.max(1, Math.round(performance.now() - _t0Ref.current));
    setProgress(100);
    setEtaSeconds(0);
    try {
      const key = makeEtaKey?.() || "bt_eta::default";
      const hist = loadEtaHist(key);
      hist.push(realMs);
      saveEtaHist(key, hist);
    } catch {}
    setTimeout(() => { setShowProgress(false); setProgress(0); setEtaSeconds(null); }, 450);
  };

  return { progress, showProgress, etaSeconds, begin, finish };
}
