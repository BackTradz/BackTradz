// ============================================================
// src/components/a_savoir/StrategyExplorer.jsx
// ------------------------------------------------------------
// RÔLE
// - Liste et documente les stratégies disponibles (nom, résumé, règles d’entrée, paramètres).
// - Sélection via <Select>, deep-link via ?strat=KEY, auto-scroll conditionnel vers le détail.
//
// PROPS
// - strategies: Array<{ key, label, subtitle?, tags?: string[], todo?: boolean,
//                       summary?: string, entry?: string[], params?: {name, desc}[] }>
//   → Données utilisées pour remplir l’explorateur.
//
// DÉTAILS UX
// - Si ?strat= est présent et valide → sélectionne cette stratégie (deep-link).
// - Sinon, sélectionne la première dispo, mais SANS auto-scroll initial (meilleur confort).
// - À chaque sélection, MAJ la query string pour permettre le partage du lien.
//
// ACCESSIBILITÉ
// - La zone de détail est un <section role="tabpanel" aria-live="polite">.
// - Balises sémantiques (h3/h4, ul/li, table) pour lecteurs d’écran.
//
// [BTZ-DEPLOY]
// - S’assurer que la clé de query string (“strat”) reste cohérente côté routing.
// - Le composant Select doit accepter { value, label }.
// ============================================================
import React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import Select from "../../../components/ui/select/Select";

export default function StrategyExplorer({ strategies = [] }) {
  // [BTZ] Clé de la stratégie active
  const [activeKey, setActiveKey] = useState(null);
  // [BTZ] Ref sur le bloc de détail pour calculer la position de scroll
  const detailRef = useRef(null);

  // NEW: refs pour savoir si on vient d'un lien explicite et si on a déjà scrollé
  const initFromParamRef = useRef(false);
  const didFirstScrollRef = useRef(false);

  // Deep-link au mount (lit ?strat=) ; sinon sélectionne la 1ʳᵉ sans activer l'auto-scroll
  useEffect(() => {
    if (!strategies?.length) return;
    try {
      const url = new URL(window.location.href);
      const k = url.searchParams.get("strat");
      if (k && strategies.some(s => s.key === k)) {
        setActiveKey(k);
        initFromParamRef.current = true;   // ⬅️ deep-link explicite
        return;
      }
    } catch {}
    setActiveKey(strategies[0].key);
    initFromParamRef.current = false;      // ⬅️ sélection par défaut, pas de scroll initial
  }, [strategies]);

  // [BTZ] Handler sélection stratégie via <Select>
  const handleSelect = (k) => {
    setActiveKey(k);
    try {
      // [BTZ] Permalien simple: enregistre ?strat=KEY dans l’URL
      const url = new URL(window.location.href);
      url.searchParams.set("strat", k);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  // NEW: scroll seulement si (a) deep-link (?strat=) ou (#hash), ou (b) changement utilisateur
  useEffect(() => {
    if (!detailRef.current || !activeKey) return;

    const OFFSET = 90; // hauteur approx du header/nav

    // au premier rendu : scroller uniquement si on a un lien explicite
    if (!didFirstScrollRef.current) {
      didFirstScrollRef.current = true;
      if (!initFromParamRef.current && !window.location.hash) {
        return; // ⬅️ ne pas scroller quand on arrive “normalement” sur la page
      }
    }

  // scroll avec offset (évite d'être caché sous le sticky)
  const y = detailRef.current.getBoundingClientRect().top + window.pageYOffset - OFFSET;
  window.scrollTo({ top: y, behavior: "smooth" });
}, [activeKey]);

  // [BTZ] Options pour le Select (clef → label)
  const options = useMemo(
    () => strategies.map(s => ({ value: s.key, label: s.label })),
    [strategies]
  );
  // [BTZ] Stratégie active (objet complet) pour alimenter le rendu détail
  const active = strategies.find(s => s.key === activeKey) || null;

  return (
    <div className="strat-select-layout">
      <div className="strat-select-row">
        <Select
          value={activeKey}
          onChange={handleSelect}
          options={options}
          size="md"
          variant="solid"
          fullWidth
          data-inline-label="Stratégie"
        />
      </div>

      <section ref={detailRef} className="strat-detail long" role="tabpanel" aria-live="polite">
        {!active ? (
          <div className="muted">Aucune stratégie sélectionnée.</div>
        ) : (
          <article className="strat-article">
            <header className="strat-detail-head">
              {/* [BTZ] Titre + baseline + badges */}
              <h3>{active.label}</h3>
              {active.subtitle && <div className="tagline">{active.subtitle}</div>}
              <div className="tags">
                {active.tags?.map(t => <span key={t} className="badge">{t}</span>)}
                {active.todo && <span className="badge todo">À compléter</span>}
              </div>
            </header>

            {/* Résumé */}
            <h4>Résumé</h4>
            <p className="muted">{active.summary || "—"}</p>

            {/* Conditions d’entrée */}
            <h4>Conditions d’entrée</h4>
            {active.entry?.length ? (
              <ul className="bullets">{active.entry.map((r,i)=><li key={i}>{r}</li>)}</ul>
            ) : (
              <p className="muted">À documenter.</p>
            )}

            {/* Paramètres (2 colonnes: clé | description) */}
            <h4>Paramètres</h4>
            {active.params?.length ? (
              <table className="param-table param-2col">
                <thead>
                  <tr><th>Paramètre</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {active.params.map(p => (
                    <tr key={p.name}>
                      <td><code className="param-key">{p.name}</code></td>
                      <td className="muted">{p.desc || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">À documenter.</p>
            )}
          </article>
        )}
      </section>
    </div>
  );
}
