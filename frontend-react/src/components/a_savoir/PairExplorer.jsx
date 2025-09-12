// ============================================================
// src/components/a_savoir/PairExplorer.jsx
// ------------------------------------------------------------
// RÔLE
// - Permet à l’utilisateur de parcourir les paires disponibles (via un <Select>).
// - Quand une paire est sélectionnée, affiche sa fiche documentaire (summary/specs/notes/liens).
// - Supporte le deep-link via l’URL (?pair=SYMBOL) et un auto-scroll vers la fiche.
//
// DÉPENDANCES & CONTRATS
// - UI: Select (composant interne) pour l’autocomplete/choix.
// - Données: PAIRS_MAP (métadonnées: clé → { label, ... }), getPip (résout la taille de pip),
//            PAIR_DOCS (contenu de la fiche par paire).
// - Accessibilité: la fiche est un <section role="tabpanel" aria-live="polite">.
//
// DÉTAILS UX
// - Trie les options du select par label (français) pour une recherche plus naturelle.
// - Met à jour l’URL lors d’une sélection (history.replaceState) pour garder un permalien.
// - Scrolle vers le détail seulement si on vient d’un deep-link ou d’un hash (#...)
//   OU lors d’un changement manuel par l’utilisateur.
//
// [BTZ-DEPLOY]
// - S’assurer que PAIRS_MAP, getPip et PAIR_DOCS soient bien fournis depuis la config.
// - Si le nom de la query string change, MAJ "pair" dans le code (deep-link).
// ============================================================
import React from "react";
import Select from "../ui/select/Select";
import PAIRS_MAP, { getPip } from "../../config/labels/pairs.map"; // ✅ un seul import
import PAIR_DOCS from "../../config/docs/pairs.docs";              // fiches explicatives

/**
 * PairExplorer
 * - Select de recherche des paires (basé sur PAIRS_MAP)
 * - Affiche la fiche explicative (PAIR_DOCS)
 * - Deep-link via ?pair=SYMBOL
 * - Ajoute un badge Pip + fallback si info manquante
 * - 0 régression: style identique à StrategyExplorer
 */
export default function PairExplorer() {
  // [BTZ] Etat contrôlant la paire sélectionnée (clé dans PAIRS_MAP / PAIR_DOCS)
  const [activeKey, setActiveKey] = React.useState(null);
  // [BTZ] Référence DOM pour calculer l’offset de scroll vers la fiche
  const detailRef = React.useRef(null);
  // [BTZ] Flags pour savoir si l’état initial vient d’un deep-link et si on a déjà fait un scroll une fois
  const initFromParamRef = React.useRef(false);
  const didFirstScrollRef = React.useRef(false);

  // Options du select (ordonnées par label UX)
  const options = React.useMemo(() => {
    // [BTZ] Transforme PAIRS_MAP (objet) en liste d’options { value, label }
    const rows = Object.entries(PAIRS_MAP).map(([key, meta]) => ({
      value: key,
      label: meta?.label || key,
    }));
    // [BTZ] Trie alpha en français (collation "fr")
    return rows.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, []);

  // Init depuis l’URL (?pair=…)
  React.useEffect(() => {
    try {
      // [BTZ] Parse l’URL courante pour extraire la paire demandée par le lien
      const url = new URL(window.location.href);
      const k = url.searchParams.get("pair");
      if (k && PAIRS_MAP[k]) {
        // [BTZ] Valeur valide → initialise la sélection + marque deep-link
        setActiveKey(k);
        initFromParamRef.current = true;
      }
    } catch {}
  }, []);

  // [BTZ] Handler appelé par <Select> lorsqu’une paire est choisie
  const handleSelect = (k) => {
    setActiveKey(k);
    try {
      // [BTZ] Met à jour la query string pour conserver un permalien propre
      const url = new URL(window.location.href);
      url.searchParams.set("pair", k);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  // Scroll vers la fiche si deep-link ou après sélection
  React.useEffect(() => {
    if (!detailRef.current || !activeKey) return;
    const OFFSET = 90; // [BTZ] marge pour éviter le header sticky

    // [BTZ] Ne scroller automatiquement qu’une seule fois au premier rendu
    if (!didFirstScrollRef.current) {
      didFirstScrollRef.current = true;
      // [BTZ] Cas: arrivée “normale” sans deep-link et sans hash → pas d’auto-scroll initial
      if (!initFromParamRef.current && !window.location.hash) return;
    }

    // [BTZ] Calcule la position cible à l’écran en soustrayant l’offset
    const y =
      detailRef.current.getBoundingClientRect().top +
      window.pageYOffset -
      OFFSET;
    // [BTZ] Scroll fluide vers la fiche
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [activeKey]);

  // [BTZ] Récupère le contenu de fiche + métadonnées UX pour la paire active
  const activeDoc = activeKey ? PAIR_DOCS[activeKey] : null;
  const uxLabel = activeKey ? PAIRS_MAP[activeKey]?.label || activeKey : null;
  const pipVal = activeKey ? getPip(activeKey) : null;

  return (
    <div className="strat-select-layout">
      {/* [BTZ] Sélecteur de paire — composant commun aux explorateurs */}
      <div className="strat-select-row">
        <Select
          value={activeKey}
          onChange={handleSelect}
          options={options}
          placeholder="Sélectionner une paire…"
          size="md"
          variant="solid"
          fullWidth
          data-inline-label="Paire"
        />
      </div>

      {/* [BTZ] Zone de détail de la fiche — a11y: role tabpanel + aria-live */}
      <section
        ref={detailRef}
        className="strat-detail long"
        role="tabpanel"
        aria-live="polite"
      >
        {!activeKey ? (
          // [BTZ] État vide : invite à choisir une paire
          <div className="muted">Choisis une paire pour afficher sa fiche.</div>
        ) : (
          <article className="strat-article">
            <header className="strat-detail-head">
              {/* [BTZ] Titre UX = label humain de la paire */}
              <h3>{uxLabel}</h3>
              <div className="tags">
                {/* [BTZ] Badges d’info court (référence + pip + statut doc) */}
                <span className="badge">Référence paire</span>
                {pipVal != null && <span className="badge">{`Pip: ${pipVal}`}</span>}
                {!activeDoc && <span className="badge todo">À compléter</span>}
              </div>
            </header>

            {/* Résumé */}
            <h4>Résumé</h4>
            <p className="muted">
              {activeDoc?.summary || "Documentation à compléter pour cette paire."}
            </p>

            {/* Spécifications clés */}
            <h4>Spécifications</h4>
            {activeDoc?.specs?.length ? (
              <ul className="bullets">
                {activeDoc.specs.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">—</p>
            )}

            {/* Notes / conseils */}
            <h4>Notes & conseils</h4>
            <p className="muted">{activeDoc?.notes || "—"}</p>

            {/* Liens utiles */}
            {activeDoc?.links?.length ? (
              <>
                <h4>Liens utiles</h4>
                <ul className="bullets">
                  {activeDoc.links.map((l, i) => (
                    <li key={i}>
                      <a className="link" href={l.href}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </article>
        )}
      </section>
    </div>
  );
}
