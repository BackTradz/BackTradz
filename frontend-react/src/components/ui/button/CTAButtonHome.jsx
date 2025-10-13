import React from "react";
import "./CTAButtonHome.css"; // ⬅️ IMPORTANT : styles scoped au composant

export default function CTAButtonHome({
  onClick,
  children,
  className = "",
  disabled = false,
  type = "button",
  ariaLabel,
}) {
  return (
    <button
      type={type}
      className={`cta-home ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {/* layers décoratives (pas d’images) */}
      <span className="cta-home__edge" aria-hidden="true" />
      <span className="cta-home__sheen" aria-hidden="true" />
      <span className="cta-home__glow" aria-hidden="true" />

      <span className="cta-home__label">{children}</span>
    </button>
  );
}
