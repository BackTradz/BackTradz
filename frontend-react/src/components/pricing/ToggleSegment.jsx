// ToggleSegment.jsx — switch "one_shot" ↔ "subscription"
// Cohérent avec les tabs Backtest (bt-segmented style adapté en pr-*)
export default function ToggleSegment({ value, onChange }) {
  return (
    <div className="pr-segmented" role="tablist" aria-label="Type d'offres">
      <button
        type="button"
        role="tab"
        aria-selected={value === "one_shot"}
        className={`pr-seg-btn ${value === "one_shot" ? "is-active" : ""}`}
        onClick={() => onChange("one_shot")}
      >
        Crédits (paiement unique)
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "subscription"}
        className={`pr-seg-btn ${value === "subscription" ? "is-active" : ""}`}
        onClick={() => onChange("subscription")}
      >
        Abonnements
      </button>
    </div>
  );
}
