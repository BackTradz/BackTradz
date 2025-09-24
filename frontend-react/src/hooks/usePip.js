import { useEffect, useState } from "react";
// Fallback front (même source que ton sélecteur)
import PAIRS_MAP, { getPip as getPipFront } from "../config/labels/pairs.map";

/**
 * usePip(symbol)
 * - Essaie d'abord l'API backend /api/meta/pip (source de vérité runner/analyseur)
 * - Si erreur / null -> fallback front getPipFront(symbol)
 */
export default function usePip(symbol) {
  const [pip, setPip] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let abort = false;
    if (!symbol) { setPip(null); return; }

    (async () => {
      try {
        setLoading(true);
        // 1) backend
        const res = await fetch(`/api/pip?symbol=${encodeURIComponent(symbol)}`);
        if (res.ok) {
          const data = await res.json();
          if (!abort && data && typeof data.pip !== "undefined" && data.pip !== null) {
            setPip(data.pip);
            return;
          }
        }
      } catch (_) {
        // noop → on tente le fallback front
      } finally {
        setLoading(false);
      }

      // 2) fallback front
      if (!abort) {
        const front = getPipFront(symbol);
        setPip(front ?? null);
      }
    })();

    return () => { abort = true; };
  }, [symbol]);

  return { pip, loading };
}
