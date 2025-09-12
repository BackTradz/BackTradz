// components/backtest/DatePresets.jsx

// 🗓️ Presets de dates rapides pour filtrer les backtests
// - Envoie (start, end) sous forme de string YYYY-MM-DD à onRange()

export default function DatePresets({ onRange }) {
  // 📅 Format YYYY-MM-DD
  const fmt = d => d.toISOString().slice(0,10);

  // 📆 7 derniers jours
  const set7d = () => {
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - 6);
    onRange(fmt(start), fmt(end));
  };

  // 📆 30 derniers jours
  const set30d = () => {
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - 29);
    onRange(fmt(start), fmt(end));
  };

  // 📆 Ce mois-ci
  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth()+1, 0);
    onRange(fmt(start), fmt(end));
  };

  // 📆 Mois précédent
  const setLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    onRange(fmt(start), fmt(end));
  };

  return (
    <div className="bt-presets">
      <span style={{color:"#94a3b8",fontSize:".85rem"}}>Presets :</span>
      <button type="button" className="bt-chip" onClick={set7d}>Derniers 7 jours</button>
      <button type="button" className="bt-chip" onClick={set30d}>Derniers 30 jours</button>
      <button type="button" className="bt-chip" onClick={setThisMonth}>Ce mois-ci</button>
      <button type="button" className="bt-chip" onClick={setLastMonth}>Mois dernier</button>
    </div>
  );
}
