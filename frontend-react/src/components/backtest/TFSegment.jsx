// components/backtest/TFSegment.jsx

// 🔘 Composant "pills" pour choisir la timeframe (parmi M5 à H4)
// - Exclut M1 et D1 volontairement (non gérées)

export default function TFSegment({ value, onChange }) {
  const options = ["H4","H1","M30","M15","M5"]; // Timeframes valides

  return (
    <div className="bt-segmented">
      {options.map(tf => (
        <button
          key={tf}
          type="button"
          className={`bt-seg-btn ${value === tf ? "is-active":""}`}
          onClick={() => onChange(tf)}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
