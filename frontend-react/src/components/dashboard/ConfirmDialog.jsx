// src/components/dashboard/ConfirmDialog.jsx
// ------------------------------------------------------------
// Boîte de confirmation générique, rendue dans un PORTAL.
// - S'affiche au-dessus de tout grâce au z-index/fixed.
// - Ferme sur clic backdrop ou touche Échap.
// ------------------------------------------------------------

import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;

  // Fermer sur ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Styles inlines minimaux (pour éviter les soucis de z-index).
  // Tu peux garder tes classes CSS actuelles : on laisse les className aussi.
  const styles = {
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "16px",
    },
    modal: {
      width: "min(520px, 95vw)",
      background: "rgba(16,22,35,.98)",
      border: "1px solid rgba(255,255,255,.06)",
      borderRadius: "14px",
      boxShadow: "0 20px 60px rgba(0,0,0,.45)",
      padding: "20px",
      color: "#e8eefc",
    },
    actions: {
      marginTop: "16px",
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      flexWrap: "wrap",
    },
  };

  const node = (
    <div
      className="modal-backdrop"
      style={styles.backdrop}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // clic sur le fond = annuler ; on ne ferme pas si on clique dans la modale
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="modal" style={styles.modal}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        {message && <p style={{ opacity: 0.9 }}>{message}</p>}

        <div className="modal-actions" style={styles.actions}>
          <button className="dbt-btn dbt-secondary" onClick={onCancel}>
            Annuler
          </button>
          <button className="dbt-btn dbt-danger" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
