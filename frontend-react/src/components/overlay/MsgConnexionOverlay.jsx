import React, { useEffect, useRef } from "react";
import CTAButton from "../ui/button/CTAButton";
import BacktradzLogo from "../ui/BacktradzLogo/BacktradzLogo";
import "./msgConnexionOverlay.css";

/**
 * Overlay "connexion requise" (safe classes: bt-conn-*)
 * - Fullscreen backdrop + panel centré (sans réutiliser les classes de l’overlay succès)
 * - ESC, ENTER, clic sur le backdrop => close
 *
 * Props:
 *   open?: boolean  (default true)
 *   onClose?: () => void
 */
export default function MsgConnexionOverlay({ open = true, onClose }) {
  const ref = useRef(null);
  // v1.2 — construit le "next" vers la page courante (sécurisé côté Auth)
  const next = encodeURIComponent(window.location.pathname + window.location.search);
 

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bt-conn-backdrop" onClick={onClose}>
      <div
        className="bt-conn-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bt-conn-title"
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bt-conn-head">
          <BacktradzLogo size="lg" to="/" className="select-none" />
        </div>

        {/* Title */}
        <h2 id="bt-conn-title" className="bt-conn-title">
          <span className="bt-conn-title-line">Connecte-toi pour continuer</span>
          <span className="bt-conn-title-sub">Téléchargements & Backtests</span>
        </h2>

        {/* Body */}
        <div className="bt-conn-body">
          <ul className="bt-conn-list">
            <li><Dot /> Accède aux téléchargements CSV (−1 crédit).</li>
            <li><Dot /> Lance des backtests et exporte tes résultats.</li>
            <li><Dot /> Historique centralisé sur ton profil.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="bt-conn-actions">
          {/* 👉 ouvre l’onglet "Inscription" */}
          <CTAButton as="a" href={`/login?tab=register&next=${next}`} variant="secondary" fullWidth>
            S’inscrire gratuitement
          </CTAButton>
          {/* 👉 ouvre l’onglet "Connexion" */}
          <CTAButton as="a" href={`/login?tab=login&next=${next}`} variant="ghost" fullWidth>
            Se connecter
          </CTAButton>
          <CTAButton variant="ghost" fullWidth onClick={onClose}>
            Continuer en visite
          </CTAButton>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="bt-conn-dot" aria-hidden="true">•</span>;
}
