import React, { useId } from "react";
import { Link } from "react-router-dom";   // ⬅️ ajouter ça
import "./BacktradzLogo.css";

export default function BacktradzLogo({
  size = "md",
  variant = "default",           // "default" | "compact"
  tradzX,                        // 🔧 X du mot “Tradz” (override explicite)
  clipX,                         // 🔧 bord du clip qui masque “Tradz”
  primary,
  accent,
  glow = true,
  className = "",
  to,
  href,
  style,
}) {
  const uid = useId();
  const idChrome = `btzChrome-${uid}`;
  const idBlue   = `btzBlue-${uid}`;
  const idShadow = `btzShadow-${uid}`;
  const idShadowChrome = `btzShadowChrome-${uid}`;
  const idClipTradz = `btzClipTradz-${uid}`;   // 🔹 clip unique pour cacher Tradz derrière Back

  // ---- Réglages précis selon le variant (grand vs petit logo) ----
  const isCompact = variant === "compact";
  
  // Position finale du mot "Tradz" (en unités du viewBox 270x80)
  const X_TRADZ_DEFAULT   = isCompact ? 108 : 122;
  // Bord du clip (cache “Tradz” tant qu’il est derrière “Back”)
  const CLIP_X_DEFAULT    = isCompact ? 106 : 118;
  // ✅ Valeurs finales (priorité aux props explicites)
  const X_TRADZ = (typeof tradzX === "number") ? tradzX : X_TRADZ_DEFAULT;
  const CLIP_X  = (typeof clipX  === "number") ? clipX  : CLIP_X_DEFAULT;

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

  return (
    <Wrapper
      aria-label="Backtradz"
      className={`btz-logo ${sizes[size]} ${glow ? "btz-logo--glow" : ""} ${className}`}
      style={style}
      {...wrapperProps}
    >
      {/* SVG = rendu net garanti, insensible aux blur/filters des parents */}
      <svg
        className="btz-svg"
        viewBox="0 0 270 80"
        role="img"
        aria-label="BackTradz"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* Chrome identique au Hero */}
          <linearGradient id={idChrome} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#f8faff"/>
            <stop offset="48%" stopColor="#cdd9ff"/>
            <stop offset="100%" stopColor="#9ab4ff"/>
          </linearGradient>
          {/* Bleu signature profond */}
          <linearGradient id={idBlue} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#6aa0ff"/>
            <stop offset="55%" stopColor="#2f51ff"/>
            <stop offset="100%" stopColor="#1a2b6e"/>
          </linearGradient>
          {/* 🟦 Recette Hero EXACTE (CSS text-shadow):
                0 0 10px rgba(80,130,255,0.06),
                0 2px 6px rgba(0,0,0,0.35) */}
          <filter id={idShadow} x="-12%" y="-20%" width="140%" height="180%" colorInterpolationFilters="sRGB">

            <feFlood flood-color="rgb(80,130,255)" flood-opacity="0.06" result="glowColor"/>
            <feComposite in="glowColor" in2="SourceAlpha" operator="in" result="glowMask"/>
            <feGaussianBlur in="glowMask" stdDeviation="10" result="glowBlur"/>
            <feOffset in="glowBlur" dx="0" dy="0" result="glow"/>


            <feFlood flood-color="black" flood-opacity="0.35" result="shadowColor"/>
            <feComposite in="shadowColor" in2="SourceAlpha" operator="in" result="shadowMask"/>
            <feGaussianBlur in="shadowMask" stdDeviation="6" result="shadowBlur"/>
            <feOffset in="shadowBlur" dx="0" dy="2" result="shadow"/>


            <feMerge>
              <feMergeNode in="glow"/>
             <feMergeNode in="shadow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* 🟦 Variante pour "Back" : même recette + légère atténuation (-4%)
               → correspond au rendu un peu plus "gris" du Hero sans changer
               les stops du dégradé chrome. */}
          <filter id={idShadowChrome} x="-12%" y="-20%" width="140%" height="180%" colorInterpolationFilters="sRGB">

            <feFlood flood-color="rgb(80,130,255)" flood-opacity="0.06" result="glowColor"/>
            <feComposite in="glowColor" in2="SourceAlpha" operator="in" result="glowMask"/>
            <feGaussianBlur in="glowMask" stdDeviation="10" result="glowBlur"/>
            <feOffset in="glowBlur" dx="0" dy="0" result="glow"/>

            <feFlood flood-color="black" flood-opacity="0.35" result="shadowColor"/>
            <feComposite in="shadowColor" in2="SourceAlpha" operator="in" result="shadowMask"/>
            <feGaussianBlur in="shadowMask" stdDeviation="6" result="shadowBlur"/>
            <feOffset in="shadowBlur" dx="0" dy="2" result="shadow"/>

            <feMerge>
              <feMergeNode in="glow"/>
              <feMergeNode in="shadow"/>
              <feMergeNode>
                <feComponentTransfer>
                  <feFuncR type="linear" slope="0.96"/>
                  <feFuncG type="linear" slope="0.96"/>
                  <feFuncB type="linear" slope="0.96"/>
                  <feFuncA type="linear" slope="1"/>
                </feComponentTransfer>
              </feMergeNode>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
           {/* 🔹 Clip userSpaceOnUse — aligné sur la variante (grand/petit) */}
          <clipPath id={idClipTradz} clipPathUnits="userSpaceOnUse">
            <rect x={CLIP_X} y="0" width="200" height="80" />
          </clipPath>
        </defs>

        {/* 🧱 Ordre SVG = calques : Tradz DERRIÈRE, puis Back AU-DESSUS */}
        <text
          clipPath={`url(#${idClipTradz})`}   /* ✅ empêche la fuite visible derrière Back */
          className="btz-txt btz-txt--tradz"     /* animé */
          x={X_TRADZ} y="55"                  /* ✅ X adapté au variant */
          fill={`url(#${idBlue})`}
          style={{ fill: `url(#${idBlue})`, fillOpacity: 1 }}
          filter={`url(#${idShadow})`}
        >Tradz</text>

        <text
          className="btz-txt"
          x="0" y="55"
          fill={`url(#${idChrome})`}
          filter={`url(#${idShadowChrome})`}
          style={{ fill: `url(#${idChrome})`, fillOpacity: 1 }}
        >Back</text>
      </svg>
    </Wrapper>
  );
}
