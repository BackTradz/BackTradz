// src/components/profil/DangerZone.jsx
export default function DangerZone({ onUnsubscribe, onDelete }) {
  return (
    <div className="card slide-up" style={{ borderColor: "rgba(255,0,0,.2)" }}>
      <h2 className="card-title">Zone de danger</h2>
      <p className="muted" style={{ marginBottom: 10 }}>
        Attention : ces actions sont irréversibles.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-outline" onClick={onUnsubscribe}>Annuler l’abonnement</button>
        <button className="btn btn-danger" onClick={onDelete}>Supprimer mon compte</button>
      </div>
    </div>
  );
}
