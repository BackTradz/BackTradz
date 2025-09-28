// components/backtest/TopProgressBar.jsx

// 📊 Barre de progression horizontale placée en haut de page
// - Utilisée pour indiquer une tâche globale (ex : analyse CSV)

export default function TopProgressBar({ show, progress }) {
  if (!show) return null; // 🔒 Affichage conditionnel

  return (
    <div className="bt-topbar">
      <div className="bt-topbar-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}
