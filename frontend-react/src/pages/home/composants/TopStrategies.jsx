// src/components/home/TopStrategies.jsx
// -----------------------------------------------------------------------------
// Section "Top stratégies du moment" (Home publique)
// - affiche 3 à 6 cartes
// - bouton "Voir les détails" (tes classes) qui ouvre PublicInsightsOverlay
// - overlay s’ouvre même si folder absent (message explicite), sinon charge XLSX
// -----------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatStrategy } from "../../../lib/labels";
import { API_BASE } from "../../../sdk/apiClient"; // garde ton chemin actuel

import SectionTitle from "../../../components/ui/SectionTitle";
import "../../../pages/home/Home.css";
import PublicInsightsOverlay from "../../../components/overlay/PublicInsightsOverlay";
import DetailButton from "../../../components/ui/button/DetailButton";
// Animations légères
const container = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { staggerChildren: 0.12, duration: 0.5, ease: "easeOut" } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
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


export default function TopStrategies() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState({ open: false, item: null });

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
      className="ts-wrap"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={container}
    >
      {/* Titre */}
      <motion.div variants={item}>
        <SectionTitle>Top stratégies du moment</SectionTitle>
      </motion.div>

      {error && <p className="ts-error">{error}</p>}

      {/* Grille */}
      <motion.div className="ts-grid" variants={container}>
        {(loading ? skel : strategies.length ? strategies : skel).map((_, i) => {
          const s = strategies[i];
          return (
            <motion.article key={i} className="ts-card" variants={item}>
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
                      <span className={`ts-kpi ${Number(s.winrate_tp1) >= 55 ? "good" : ""}`}>
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
                      <DetailButton
                        onClick={() => setPreview({ open: true, item: toOverlayItem(s) })}
                        aria-label="Voir les détails de la stratégie"
                        className="ts-cta"
                      >
                        Voir les résultats
                      </DetailButton>
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
