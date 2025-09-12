// components/backtest/InlineProgress.jsx

// 🔄 Barre de progression compacte (inline)
// - Utilisée lors du chargement d'une analyse
// - Affiche un pourcentage + message "Analyse en cours…"

export default function InlineProgress({ show, progress }) {
  if (!show) return null; // 🔒 Pas de rendu si flag désactivé

  return (
    <div className="bt-inline-progress" role="status" aria-live="polite">
      <div className="bt-inline-track">
        <div className="bt-inline-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="bt-inline-legend">
        <span className="bt-inline-percent">{progress}%</span>
        <span className="bt-inline-note">Analyse en cours…</span>
      </div>
    </div>
  );
}
