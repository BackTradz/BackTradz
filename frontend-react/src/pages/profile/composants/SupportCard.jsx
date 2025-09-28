// src/components/SupportCard.jsx
export default function SupportCard() {
  return (
    <div className="card slide-up support-card">
      <div className="support-head">
        <div className="support-icon" aria-hidden>✉️</div>
        <div>
          <h2 className="card-title m-0">Support & assistance</h2>
          <p className="support-sub">Disponible <strong>24h/24 – 7j/7</strong>. Réponse rapide par e-mail.</p>
        </div>
      </div>

      <ul className="support-list">
        <li>Accompagnement personnalisé</li>
        <li>Aide technique & facturation</li>
        <li>Suivi jusqu’à résolution</li>
      </ul>

      <div className="support-actions">
        <a href="/support" className="btn btn-primary">Contacter le support</a>
      </div>
    </div>
  );
}
