import React from "react";
import LegalLayout from "./LegalLayout";

export default function PolitiqueConfidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        <strong>BackTradz</strong> respecte votre vie privée. Cette politique
        explique quelles données nous traitons, pour quelles finalités et vos
        droits en matière de protection des données.
      </p>

      <h2>1) Données traitées</h2>
      <ul>
        <li>Identité : nom, prénom, e-mail, identifiant de compte.</li>
        <li>Usage : paramètres, backtests lancés, volumes, téléchargements.</li>
        <li>Fichiers : CSV importés (contenu nécessaire au traitement).</li>
        <li>Technique : logs, adresses IP, user-agent, évènements d’erreur.</li>
        <li>Paiements : gérés par des prestataires (ex. Stripe / PayPal / NowPayments).</li>
      </ul>

      <h2>2) Finalités</h2>
      <ul>
        <li>Fourniture du service (auth, backtests, crédits, exports).</li>
        <li>Support & prévention fraude/abus.</li>
        <li>Amélioration produit & statistiques agrégées.</li>
        <li>Obligations légales (facturation, conservation minimale).</li>
      </ul>

      <h2>3) Bases légales</h2>
      <ul>
        <li>Exécution du contrat (CGU) : accès aux fonctionnalités.</li>
        <li>Intérêt légitime : sécurité, amélioration continue.</li>
        <li>Obligation légale : conservation de pièces comptables.</li>
        <li>Consentement : communications facultatives.</li>
      </ul>

      <h2>4) Durées de conservation</h2>
      <ul>
        <li>Compte : pendant l’usage + 12 mois d’archivage de sécurité.</li>
        <li>Logs techniques : durée courte (ex. 30–90 jours) pour sécurité.</li>
        <li>Comptable (paiements) : selon obligations légales.</li>
        <li>CSV importés : durée du traitement et rétention limitée côté compute.</li>
      </ul>

      <h2>5) Sous-traitants</h2>
      <p>
        Nous pouvons recourir à des solutions cloud (hébergement, e-mail,
        traitement des paiements). Ils s’engagent contractuellement à assurer
        un niveau de sécurité approprié.
      </p>

      <h2>6) Transferts hors UE</h2>
      <p>
        Le cas échéant, des clauses contractuelles types (CCT) et mesures
        complémentaires sont mises en place.
      </p>

      <h2>7) Sécurité</h2>
      <p>
        Accès chiffré (HTTPS), mots de passe hachés, séparation des rôles,
        sauvegardes et monitoring. Vous devez maintenir un mot de passe fort.
      </p>

      <h2>8) Vos droits (RGPD)</h2>
      <ul>
        <li>Accès, rectification, effacement, limitation, opposition, portabilité.</li>
        <li>Retrait du consentement pour les traitements facultatifs.</li>
        <li>Réclamation possible auprès de l’autorité locale de contrôle.</li>
      </ul>

      <h2>9) Cookies & analytics</h2>
      <p>
        Nous limitons le tracking au strict nécessaire au fonctionnement et à
        la mesure agrégée d’usage. Les réglages de cookies peuvent être
        présentés dans une bannière de consentement si nécessaire.
      </p>

      <h2>10) Contact</h2>
      <p>
        Délégué/contact confidentialité : <strong>BackTradz@outlook.com</strong>
      </p>

      <hr className="legal-sep" />
      <p className="legal-meta">Dernière mise à jour : 13-10-2025</p>
    </LegalLayout>
  );
}
