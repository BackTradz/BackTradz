import React from "react";
import { Link } from "react-router-dom";   // ⬅️ ajouter ça
import "./BacktradzLogo.css";

export default function BacktradzLogo({
  size = "md",
  primary,
  accent,
  glow = true,
  className = "",
  to,
  href,
  style,
}) {
  const sizes = {
    sm: "btz-logo--sm",
    md: "btz-logo--md",
    lg: "btz-logo--lg",
    xl: "btz-logo--xl",
  };

  // ✅ wrapper correct en ESM
  const Wrapper = to ? Link : href ? "a" : "div";

  const wrapperProps = to
    ? { to }
    : href
    ? { href, rel: "noopener noreferrer" }
    : {};

  const cssVars = {
    ...(primary ? { "--btz-primary": primary } : {}),
    ...(accent ? { "--btz-accent": accent } : {}),
  };

  return (
    <Wrapper
      aria-label="Backtradz"
      className={`btz-logo ${sizes[size]} ${glow ? "btz-logo--glow" : ""} ${className}`}
      style={{ ...cssVars, ...style }}
      {...wrapperProps}
    >
      <span className="btz-back" aria-hidden="true">Back</span>
      <span className="btz-tradz" aria-hidden="true">Tradz</span>
      <span className="sr-only">BackTradz</span>
    </Wrapper>
  );
}
