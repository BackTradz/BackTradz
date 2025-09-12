import React, { useEffect, useMemo, useRef, useState } from "react";
import "./TopProgress.css";

/**
 * TopProgress — barre de chargement fixe en haut de l’écran
 * Props:
 * - active   : boolean (true = montre la barre)
 * - height   : px (default 3)
 * - from/to  : couleurs du dégradé
 * - zIndex   : z-index (default 9999)
 */
export default function TopProgress({
  active = false,
  height = 3,
  from = "#22d3ee",   // cyan
  to = "#6366f1",     // indigo
  zIndex = 9999,
}) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const styleVars = useMemo(
    () => ({
      "--tp-height": `${height}px`,
      "--tp-from": from,
      "--tp-to": to,
      "--tp-z": zIndex,
    }),
    [height, from, to, zIndex]
  );

  // Avancement “naturel” pendant le chargement
  useEffect(() => {
    clearInterval(timerRef.current);
    if (active) {
      setVisible(true);
      setProgress((p) => (p < 8 ? 8 : p)); // démarre pas à 0 pour l'effet
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          const inc = (100 - p) * 0.12 + Math.random() * 2;
          const next = Math.min(p + inc, 90); // plafonne vers 90% tant que actif
          return next;
        });
      }, 180);
    } else {
      // termine proprement puis cache
      setProgress(100);
      const t = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 320);
      return () => clearTimeout(t);
    }
    return () => clearInterval(timerRef.current);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="tp-root" style={styleVars}>
      <div className="tp-bar" style={{ width: `${progress}%` }}>
        <div className="tp-peg" />
      </div>
    </div>
  );
}
