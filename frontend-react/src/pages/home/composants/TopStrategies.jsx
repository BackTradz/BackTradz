// src/components/home/TopStrategies.jsx
// -----------------------------------------------------------------------------
// Section "Top stratégies du moment" (Home publique)
// - affiche 3 à 6 cartes
// - bouton "Voir les détails" (tes classes) qui ouvre PublicInsightsOverlay
// - overlay s’ouvre même si folder absent (message explicite), sinon charge XLSX
// -----------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatStrategy } from "../../../lib/labels";
import { API_BASE } from "../../../sdk/apiClient"; // garde ton chemin actuel

import SectionTitle from "../../../components/ui/SectionTitle";
import "../../../pages/home/Home.css";
import PublicInsightsOverlay from "../../../components/overlay/PublicInsightsOverlay";
import ResultButton from "../../../components/ui/button/CTAButtonHome";
import CTAButtonHome from "../../../components/ui/button/CTAButtonHome";

// Variants uniques (section & cartes) — clean + lisible
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.38, ease: "easeOut", staggerChildren: 0.06, delayChildren: 0.04 }
  }
};
const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.985, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }
  }
};

// Retourne le chemin XLSX (peu importe le nom utilisé par l’API)
function getFolder(s) {
  return (
    s?.folder ||            // <<< maintenant fourni par l’API
    s?.xlsx_folder ||
    s?.bt_folder ||
    s?.xlsxPath ||
    s?.xlsx ||
    s?.meta?.folder ||
    ""
  );
}

// Mapper la carte -> item pour l’overlay public
function toOverlayItem(s) {
  const folder = getFolder(s);
  return {
    folder,                                      // requis pour charger XLSX
    symbol: s.pair,
    timeframe: s.timeframe,
    strategy: s.strategy_name || s.strategy,
    period: s.period ||                          // <<< nouveau champ API
            (s.from_date && s.to_date ? `${s.from_date}to${s.to_date}` : "")
  };
}

// Effet tech discret à l’apparition (stagger)
const tsContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 }
  }
};

const tsCardFx = {
  hidden: { opacity: 0, y: 16, scale: 0.985, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }
  }
};



export default function TopStrategies() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState({ open: false, item: null });
  const prefersReduced = useReducedMotion();

  // Fetch Top stratégies (public)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/top-strategy`);
        if (!res.ok) throw new Error("Aucune stratégie trouvée");
        const data = await res.json();
        setStrategies(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch {
        setError("❌ Aucune stratégie disponible pour l’instant.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const skel = Array.from({ length: 3 });

  return (
    <motion.section
      className="ts-wrap layer-top"
      variants={sectionVariants}
      initial={prefersReduced ? false : "hidden"}
      whileInView={prefersReduced ? false : "show"}
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Titre */}
      <motion.div variants={sectionVariants}>
        <SectionTitle>
          <span className="only-desktop">Top stratégies du moment</span>
          <span className="only-mobile">Top stratégies</span>
        </SectionTitle>
      </motion.div>

      {error && <p className="ts-error">{error}</p>}

      {/* Grille */}
      <motion.div className="ts-grid" variants={sectionVariants}>
        {(loading ? skel : strategies.length ? strategies : skel).map((_, i) => {
          const s = strategies[i];
          return (
            <motion.article
              key={i}
              className={`ts-card${
                s && Number(s.winrate_tp1) >= 70 ? " ts-card--hot" : ""
              }`}
              variants={cardVariants}
              >
              {s ? (
                <>
                  {/* Head : badges & période */}
                  <div className="ts-head">
                    <div className="ts-badges">
                      <span className="ts-badge ts-badge--pair">{s.pair || "—"}</span>
                      {s.timeframe && <span className="ts-badge ts-badge--tf">{s.timeframe}</span>}
                    </div>
                    {(s.from_date || s.to_date) && (
                      <div className="ts-range">
                        {new Date(s.from_date).toLocaleDateString("fr-FR")} <span className="mx">→</span>
                        {new Date(s.to_date).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>

                  {/* Body : stratégie + KPIs */}
                  <div className="ts-body">
                    <div className="ts-row">
                      <span className="ts-label">Stratégie</span>
                      <span className="ts-value ts-strat">
                        {formatStrategy(s.strategy_name || s.strategy) || (s.strategy_name || "—")}
                      </span>
                    </div>

                    <div className="ts-row">
                      <span className="ts-label">Winrate TP1 RR (1:1)</span>
                      <span
                        className={`ts-kpi ${
                          Number(s.winrate_tp1) >= 70 ? "great"
                          : Number(s.winrate_tp1) >= 55 ? "good" : ""
                        }`}
                      >
                        {s.winrate_tp1 != null ? `${Number(s.winrate_tp1).toFixed(2)}%` : "—"}
                      </span>
                    </div>

                    {s.trades != null && (
                      <div className="ts-row">
                        <span className="ts-label">Trades</span>
                        <span className="ts-kpi">{s.trades}</span>
                      </div>
                    )}

                    {/* CTA : TON bouton — on ouvre toujours l’overlay
                        (si folder absent => message explicite dans l’overlay) */}
                    <div className="ts-cta-row">
                      <CTAButtonHome
                        onClick={() => setPreview({ open: true, item: toOverlayItem(s) })}
                        aria-label="Voir les détails de la stratégie"
                        className="ts-cta"
                      >
                        voir les résultats
                      </CTAButtonHome>
                    </div>
                  </div>
                </>
              ) : (
                // Skeleton quand pas de data
                <div className="ts-body">
                  <div className="skel skel-line" style={{ width: "38%", height: 12, borderRadius: 8 }} />
                  <div className="skel skel-line" style={{ width: "64%", height: 12, borderRadius: 8, marginTop: 14 }} />
                  <div className="skel skel-line" style={{ width: "48%", height: 12, borderRadius: 8, marginTop: 10 }} />
                  <div className="skel skel-line" style={{ width: "30%", height: 12, borderRadius: 8, marginTop: 22 }} />
                </div>
              )}
            </motion.article>
          );
        })}
      </motion.div>

      {/* Overlay public (lecture seule) */}
      <PublicInsightsOverlay
        open={preview.open}
        onClose={() => setPreview({ open: false, item: null })}
        item={preview.item}
      />
    </motion.section>
  );
}
