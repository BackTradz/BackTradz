// src/components/ui/CTAButton.jsx
import React from "react";
import "./CTAButton.css";

function cx(...c) { return c.filter(Boolean).join(" "); }

/**
 * Bouton CTA réutilisable basé sur tes classes .dbt-*
 * - href => <a>, sinon <button>
 * - leftIcon/rightIcon : string (emoji) ou node
 * - variant: "primary" | "secondary" | "disabled"
 * - fullWidth : largeur 100%
 */
export default function CTAButton({
  href,
  children,
  leftIcon,
  rightIcon,
  onClick,
  download,
  target,
  rel,
  disabled = false,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...rest
}) {
  const isLink = typeof href === "string" && href.length;
  const Element = isLink ? "a" : "button";

    const variantClass = disabled
    ? "cta-disabled"
    : variant === "secondary"
    ? "cta-secondary"
    : variant === "danger"
    ? "cta-danger"
    : "cta-primary";
  const common = {
    className: cx("cta-btn", variantClass, fullWidth && "cta-btn--block", className),
    ...(isLink
      ? { href, download, target, rel: target === "_blank" ? rel || "noopener noreferrer" : rel }
      : { type: "button", onClick: disabled ? undefined : onClick, disabled }),
    ...rest,
  };

  return (
    <Element {...common}>
      {leftIcon ? <span className="cta-ic">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="cta-ic">{rightIcon}</span> : null}
    </Element>
  );
}
