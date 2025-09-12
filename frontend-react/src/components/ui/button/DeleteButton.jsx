import React from "react";
import "./DeleteButton.css";

export default function DeleteButton({
  children = "Supprimer",
  onClick,
  href,
  disabled = false,
  fullWidth = false,
  icon = "",
  className = "",
  type = "button",
  ...rest
}) {
  const cls = [
    "delete-btn",
    fullWidth ? "delete-btn--block" : "",
    className,
  ].join(" ").trim();

  const Icon = icon ? <span className="delete-btn__icon" aria-hidden="true">{icon}</span> : null;

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
