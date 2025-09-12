// ============================================================
// src/components/a_savoir/TOC.jsx
// ------------------------------------------------------------
// RÔLE
// - Table Of Contents (sommaire) interne pour naviguer vers des sections (ancres #id).
// - 2 variantes : "mobile" (collapsible via <details>) et "sidebar" (desktop).
//
// PROPS
// - items: Array<{ id: string, label: string }>
// - variant: "mobile" | "sidebar" (par défaut "sidebar").
//
// UX & ACCESSIBILITÉ
// - Mobile: <details>/<summary> pour un panneau repliable natif accessible.
// - Desktop: simple liste verticale stylisée, liens vers #id.
//
// [BTZ-DEPLOY]
// - Les ids passés dans items doivent correspondre aux ids des sections (cf. <Section id="...">).
// ============================================================
import React from "react";

export function TOC({ items = [], variant = "sidebar" }) {
  if (variant === "mobile") {
    // [BTZ] Ref pour fermer le <details> automatiquement après clic (UX mobile)
    const detRef = React.useRef(null);
    const handleClick = () => detRef.current?.removeAttribute("open");

    return (
      <details ref={detRef} className="toc-mobile">
        {/* [BTZ] Bouton d’ouverture du sommaire (icône menu + libellé) */}
        <summary className="toc-mobile-button">
          <span className="dot">☰</span> Sommaire
        </summary>
        <nav className="toc-mobile-panel">
          <ul className="bullets" style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {items.map((i) => (
              <li key={i.id} style={{ margin: "2px 0" }}>
                <a
                  href={`#${i.id}`}
                  onClick={handleClick}
                  className="toc-mobile-link"
                >
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </details>
    );
  }

  // === Desktop / sidebar (inchangé)
  return (
    <nav className="card-std">
      <div className="section-title" style={{ marginBottom: 8 }}>Sommaire</div>
      <ul className="bullets" style={{ listStyle: "none", paddingLeft: 0 }}>
        {items.map(i => (
          <li key={i.id} style={{ margin: "6px 0" }}>
            <a href={`#${i.id}`} style={{ color: "#e6ecff", textDecoration: "none" }}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
