import React, { useEffect, useRef } from "react";
import CTAButton from "../ui/button/CTAButton";
import BacktradzLogo from "../ui/BacktradzLogo/BacktradzLogo";

/**
 * ✅ Overlay affiché après une inscription réussie
 * - Affiche un message de confirmation et d'information
 * - Encourage à vérifier l’e-mail pour obtenir 2 crédits
 * - Permet d'ouvrir sa messagerie ou de renvoyer l'e-mail
 * - Gère les touches clavier (Escape ou Entrée)
 */
export default function SignupSuccessOverlay({ onClose, onResend, resendLoading }) {
  const ref = useRef(null);

  // Focus automatique + gestion des touches clavier
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose(); // ferme l’overlay
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="success-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      tabIndex={-1}
      ref={ref}
    >
      {/* Logo Backtradz */}
      <div className="signup-head">
        <BacktradzLogo size="lg" to="/" className="select-none" />
      </div>

      {/* Titre et sous-titre */}
      <h2 id="signup-title" className="signup-title text-center">
        <span className="block">Merci pour votre inscription</span>
        <span className="block mt-1 text-brand font-semibold">
          E-mail envoyé • 2 crédits après validation
        </span>
      </h2>

      {/* Liste des actions à faire */}
      <div className="signup-body">
        <ul className="signup-list">
          <li><IconCheck /><span>Un e-mail de confirmation t’a été envoyé.</span></li>
          <li><IconCheck /><span>Clique le bouton dans l’e-mail pour <strong>débloquer 2 crédits</strong>.</span></li>
          <li><IconCheck /><span>Tu peux continuer sans vérification (aucun blocage).</span></li>
        </ul>
        <p className="mt-2 text-sm opacity-80 text-center">Pas reçu ? Utilise “Renvoyer l’e-mail”.</p>
      </div>

      {/* Actions CTA */}
      <div className="signup-actions">
        <div className="flex flex-col gap-2">

          <CTAButton
            variant="secondary"
            fullWidth
            disabled={!!resendLoading}
            onClick={onResend}
          >
            {resendLoading ? "Renvoi en cours..." : "Renvoyer le lien"}
          </CTAButton>

          <CTAButton
            variant="ghost"
            fullWidth
            onClick={onClose}
          >
            Continuer sans vérifier
          </CTAButton>
        </div>
      </div>
    </div>
  );
}

// ✅ Icône de check simple en SVG
function IconCheck(props) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...props} className="ic-check">
      <path
        d="M20.285 6.709a1 1 0 0 1 0 1.414l-9.192 9.193a1 1 0 0 1-1.414 0l-5.657-5.657a1 1 0 1 1 1.414-1.414l4.95 4.95 8.485-8.486a1 1 0 0 1 1.414 0z"
        fill="currentColor"
      />
    </svg>
  );
}
