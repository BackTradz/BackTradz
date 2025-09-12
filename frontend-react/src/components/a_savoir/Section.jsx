// ============================================================
// src/components/a_savoir/Section.jsx
// ------------------------------------------------------------
// RÔLE
// - Petit wrapper visuel standardisé pour une section de contenu “à savoir”.
// - Affiche un titre, un éventuel hint (sous-titre court) et le contenu passé en children.
//
// PROPS
// - id: string → ancre HTML (permet d’être ciblé via le TOC ou un lien #id).
// - title: string → titre affiché h2.
// - hint?: string → texte additionnel court à droite du titre (optionnel).
// - children: contenu JSX de la section.
//
// STYLES
// - Utilise des classes utilitaires: card-std, section-head, section-title, section-hint.
// - L’organisation visuelle vient du CSS global du projet.
// ============================================================
import React from "react";

export function Section({ id, title, hint, children }) {
  return (
    // [BTZ] L'id sert de cible d’ancrage (#id), utile avec le composant TOC
    <section id={id} className="card-std">
      <div className="section-head">
        {/* [BTZ] Titre principal de la section */}
        <h2 className="section-title">{title}</h2>
        {/* [BTZ] “Hint” facultatif (petite note complémentaire) */}
        {hint && <span className="section-hint">{hint}</span>}
      </div>
      {/* [BTZ] Contenu libre inséré par le parent */}
      <div>{children}</div>
    </section>
  );
}
