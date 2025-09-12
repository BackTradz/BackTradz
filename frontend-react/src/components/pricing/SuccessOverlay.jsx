// SuccessOverlay.jsx — overlay “Merci pour votre achat”
import { useEffect } from "react";

export default function SuccessOverlay({ open, onClose, data }) {
  if (!open) return null;

  // close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { offer, method, price, credits } = data || {};

  return (
    <div className="prsucc-backdrop" onClick={onClose}>
      <div className="prsucc-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="prsucc-hero">
          <div className="prsucc-check">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Merci pour votre achat !</h2>
          <p>Votre compte est mis à jour. Vous pouvez lancer un backtest dès maintenant.</p>
        </div>

        <dl className="prsucc-list">
          <div className="row"><dt>Offre</dt><dd className="strong">{offer || "—"}</dd></div>
          <div className="row"><dt>Prix payé</dt><dd>{price != null ? `${price} €` : "—"}</dd></div>
          <div className="row"><dt>Paiement</dt><dd>{method || "—"}</dd></div>
          <div className="row"><dt>Crédits ajoutés</dt><dd>{credits ?? "—"}</dd></div>
        </dl>

        <div className="prsucc-actions">
            <button className="btn primary"  onClick={() => window.location.assign("/backtest")}>
                🚀 Lancer un backtest
            </button>
            <button className="btn secondary" onClick={() => window.location.assign("/profile")}>
                Voir mon profil
            </button>
            <button className="btn ghost" onClick={onClose}>
                Fermer
            </button>
            </div>


        </div>
      </div>
  );
}
