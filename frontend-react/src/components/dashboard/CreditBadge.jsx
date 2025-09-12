// src/components/dashboard/CreditBadge.jsx
export default function CreditBadge({ credits = 0, plan = "free" }) {
  return (
    <div className="credit-badge">
      <span>Crédits :</span>
      <b>{credits}</b>
      <span className="sep">|</span>
      <span>Plan :</span>
      <b style={{ textTransform: "uppercase" }}>{plan}</b>
    </div>
  );
}
