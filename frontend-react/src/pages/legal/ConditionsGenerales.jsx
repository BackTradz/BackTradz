import React from "react";
import LegalLayout from "./LegalLayout";

export default function ConditionsGenerales() {
  return (
    <LegalLayout title="Conditions générales d’utilisation (CGU)">
      <p>
        Bienvenue sur <strong>BackTradz</strong>, une plateforme conçue par une
        <strong> équipe de traders & développeurs</strong> pour aider les
        traders à backtester, analyser et documenter leurs stratégies. Les
        présentes CGU encadrent l’accès et l’usage du service.
      </p>

      <h2>1. Objet</h2>
      <p>
        BackTradz fournit des outils de <strong>backtest</strong>, des
        <strong> analyses statistiques</strong>, des exports et une
        <strong> gestion de crédits</strong> permettant de lancer des calculs
        intensifs. Le service est fourni “en l’état”, à des fins d’<b>information
        et d’aide à la décision</b>, sans conseil d’investissement.
      </p>

      <h2>2. Compte & sécurité</h2>
      <ul>
        <li>Inscription requise pour accéder aux fonctions avancées.</li>
        <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
        <li>Tout usage frauduleux de votre compte doit être signalé sans délai.</li>
      </ul>

      <h2>3. Abonnements, crédits & limites</h2>
      <ul>
        <li>
          Les <strong>abonnements</strong> donnent accès à des quotas, fonctionnalités
          et priorités de file d’attente.
        </li>
        <li>
          Les <strong>crédits</strong> représentent des unités de calcul
          consommées par les backtests, exports et analyses (affiché avant
          exécution). Les crédits <em>gratuits</em> promotionnels peuvent
          expirer.
        </li>
        <li>
          Sauf indication contraire, les crédits sont <strong>non remboursables</strong>
          et non convertibles en numéraire. En cas d’incident de la plateforme,
          nous pouvons recréditer ou relancer un job.
        </li>
        <li>
          Limites anti-abus : taille de CSV, durée de backtest, fréquence
          d’appels API, etc. Ces limites peuvent évoluer pour la stabilité
          du service.
        </li>
      </ul>

      <h2>4. Données & fichiers importés</h2>
      <ul>
        <li>
          Les CSV importés doivent respecter le <strong>format documenté</strong>
          (voir “À savoir → Upload CSV”). Vous garantissez disposer des droits
          nécessaires sur les données importées.
        </li>
        <li>
          Les résultats, agrégats et exports sont fournis pour votre seul usage.
          La redistribution massive ou la revente des sorties est interdite
          sans accord écrit.
        </li>
      </ul>

      <h2>5. Usage acceptable</h2>
      <ul>
        <li>Pas de reverse-engineering, scraping massif, ou tests de charge non autorisés.</li>
        <li>Pas d’utilisation du service pour violer la loi ou des droits tiers.</li>
        <li>Pas d’accès automatisé non documenté (bots non déclarés, proxies abusifs).</li>
      </ul>

      <h2>6. Disclaimer & risques</h2>
      <p>
        Les performances passées ne préjugent pas des performances futures.
        Aucun résultat de backtest ne constitue une promesse de gain. Vous
        demeurez seul responsable de vos décisions et exécutions de marché.
      </p>

      <h2>7. Disponibilité</h2>
      <p>
        Nous visons une haute disponibilité mais ne garantissons aucun uptime.
        Des maintenances ou incidents peuvent dégrader ou interrompre le service.
      </p>

      <h2>8. Propriété intellectuelle</h2>
      <p>
        La plateforme, son code et ses contenus sont protégés. Une licence
        personnelle, non exclusive et non transférable vous est concédée pour
        la durée d’utilisation.
      </p>

      <h2>9. Résiliation</h2>
      <p>
        Vous pouvez fermer votre compte à tout moment. En cas de violation
        grave des CGU, nous pouvons suspendre ou résilier l’accès au service.
      </p>

      <h2>10. Évolution des CGU</h2>
      <p>
        Les CGU peuvent évoluer. La version en ligne fait foi. En cas de
        changement majeur, une notification pourra être affichée.
      </p>

      <h2>11. Loi applicable</h2>
      <p>
        Droit applicable et juridiction compétente selon le pays de l’éditeur
        une fois la structure légale établie.
      </p>

      <hr className="legal-sep" />
      <p className="legal-meta">
        Contact : <strong>BackTradz@outlook.com</strong> — Dernière mise à jour : 13-10-2025
      </p>
    </LegalLayout>
  );
}
