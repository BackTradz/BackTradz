import React from "react";
import LegalLayout from "./LegalLayout";

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales">
      {/* TODO (non rendu) : compléter la raison sociale si société créée */}
      {/* - Raison sociale / forme / capital / RCS / TVA
          - Adresse du siège
          - Contact support */}

      <h2>Éditeur</h2>
      <p>
        La plateforme <strong>BackTradz</strong> est éditée par une
        équipe de <strong>traders & développeurs</strong> dédiée à l’outillage
        d’analyse et de backtest pour les marchés. Les informations et outils
        fournis ont une vocation purement <strong>technique & éducative</strong>
        et ne constituent en aucun cas des conseils d’investissement.
      </p>

      <h2>Responsable de publication</h2>
      <p>
        Équipe BackTradz — contact : <strong>BackTradz@outlook.com</strong>
      </p>

      <h2>Hébergement</h2>
      <p>
        Hébergement sur infrastructure cloud haute disponibilité (CDN, compute
        et stockage redondés). Les journaux techniques peuvent être traités
        par des prestataires situés au sein de l’UE et/ou hors UE, dans le
        respect des clauses contractuelles types.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus (textes, design, éléments graphiques, code,
        marques/logos) est protégé par le droit de la propriété intellectuelle.
        Toute reproduction, modification ou diffusion non autorisée est
        interdite.
      </p>

      <h2>Liens & ressources externes</h2>
      <p>
        Des liens vers des sites tiers peuvent être proposés. Nous n’exerçons
        aucun contrôle sur leur contenu et déclinons toute responsabilité
        quant aux informations qu’ils publient.
      </p>

      <h2>Signalement d’un contenu</h2>
      <p>
        Pour toute demande légale (atteinte à un droit, contenu illicite, etc.),
        contactez <strong>BackTradz@outlook.com</strong> en précisant l’URL, la
        description et toute pièce utile.
      </p>

      <hr className="legal-sep" />
      <p className="legal-meta">Dernière mise à jour : 13-10-2025</p>
    </LegalLayout>
  );
}
