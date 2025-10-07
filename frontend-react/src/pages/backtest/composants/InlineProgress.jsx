// components/backtest/InlineProgress.jsx

// components/backtest/InlineProgress.jsx
// 🔄 Barre de progression compacte (inline) + ETA optionnel
export default function InlineProgress({ show, progress, etaSeconds }) {
  if (!show) return null; // 🔒 Pas de rendu si flag désactivé

  return (
    <div className="bt-inline-progress" role="status" aria-live="polite">
      <div className="bt-inline-track">
        <div className="bt-inline-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="bt-inline-legend">
        <span className="bt-inline-percent">{progress}%</span>
        <span className="bt-inline-note">
          {progress >= 99
            ? "Finalisation…"
            : (typeof etaSeconds === "number"
                ? `Temps restant ~ ${Math.max(0, Math.floor(etaSeconds/60))}:${String(etaSeconds%60).padStart(2,"0")}`
                : "Analyse en cours…")}
        </span>
      </div>
    </div>
  );
}
