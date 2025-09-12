import React from "react";
import "./DetailButton.css"


export default function DetailButton({
  children = "Détails",
  onClick,
  href,
  disabled = false,
  fullWidth = false,
  icon,                   // JSX ou string (optionnel)
  className = "",
  type = "button",
  ...rest
}) {
  const cls = [
    "detail-btn",
    fullWidth ? "detail-btn--block" : "",
    className,
  ].join(" ").trim();

  const Icon = icon ? <span className="detail-btn__icon" aria-hidden="true">{icon}</span> : null;

  if (href) {
    return (
      <a
        href={href}
        className={cls}
        aria-disabled={disabled || undefined}
        onClick={disabled ? (e)=>e.preventDefault() : onClick}
        {...rest}
      >
        {Icon}{children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {Icon}{children}
    </button>
  );
}
