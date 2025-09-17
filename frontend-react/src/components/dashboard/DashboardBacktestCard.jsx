// src/components/dashboard/DashboardBacktestCard.jsx
// ------------------------------------------------------------
// Carte "Backtest" utilisée sur le DASHBOARD utilisateur.
// - Bouton Détails -> modale au-dessus de tout (portal).
// - Bouton Supprimer -> boîte de confirmation (portal) puis DELETE.
// - Téléchargement .xlsx via CTAButton si disponible.
// ------------------------------------------------------------

import { useState } from "react";
import { downloadXlsxUrl } from "../../sdk/userApi";
import { useAuth } from "../../auth/AuthContext"; 
import { absApi } from "../../sdk/url"; // (en haut du fichier)
//overlay import 
import ConfirmDialog from "./ConfirmDialog";
import BacktestDetailsModal from "./BacktestDetailsModal";

// import Reutilisable//
import CTAButton from "../ui/button/CTAButton";
import DeleteButton from "../ui/button/DeleteButton"
import DetailButton from "../ui/button/DetailButton"
import BacktestInsightsOverlay from "../overlay/BacktestInsightsOverlay";
import BacktestPinsSection from "./BacktestPinsSection";
import "../overlay/insights.css"; // styles overlay (scopés .ins-*)
import usePip from "../../hooks/usePip"; 
// 🆕 helpers labels
import { formatPair, formatStrategy } from "../../lib/labels";



// Normalisation affichage pourcentages (accepte "73%", "73", 0.73, "0,73", etc.)
function fmtPct(v) {
  if (v === null || v === undefined) return "N/A";
  if (typeof v === "string") {
    const s = v.trim();
    if (s.endsWith("%")) return s;
    const n = parseFloat(s.replace(",", "."));
    if (!Number.isFinite(n)) return "N/A";
    const num = n > 1 ? n : n * 100;
    return `${Math.round(num)}%`;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const num = v > 1 ? v : v * 100;
    return `${Math.round(num)}%`;
  }
  return "N/A";
}

// --- util: dates jolies pour l'utilisateur -----------------
function fmtDateFR(iso) {
  // attend "YYYY-MM-DD" → "DD/MM/YYYY"
  if (!iso || typeof iso !== "string") return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso; // on ne casse pas si format inconnu
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function fmtPeriod(period) {
  // accepte "2025-06-30to2025-07-30" ou "2025-06-30_to_2025-07-30"
  if (!period) return "—";
  const p = period.replace(/_/g, ""); // tolère _to_
  const m = p.match(/(\d{4}-\d{2}-\d{2})\s*to\s*(\d{4}-\d{2}-\d{2})/i);
  if (!m) return period;
  return `${fmtDateFR(m[1])} → ${fmtDateFR(m[2])}`;
}

// Extrait "YYYY-MM-DDtoYYYY-MM-DD" depuis un texte (ex: le nom de dossier)
function extractPeriodFromText(txt) {
  if (!txt) return null;
  // tolère "to" avec espaces ou underscores, et variantes type "..._to_..."
  const cleaned = String(txt).replace(/_to_/gi, " to ").replace(/_/g, " ");
  const m = cleaned.match(/(20\d{2}-\d{2}-\d{2})\s*to\s*(20\d{2}-\d{2}-\d{2})/i);
  return m ? `${m[1]}to${m[2]}` : null;
}


export default function DashboardBacktestCard({ bt = {}, onDeleted }) {
  const strategy = bt.strategy || bt.strat || "—";
  const pair = bt.symbol || bt.pair || "—";
  const tf = bt.timeframe || bt.tf || "—";
  const { pip, loading: pipLoading } = usePip(pair); // 🔎 pip dynamique
  // period: on lit la valeur directe si dispo, sinon on tente de l'extraire du nom de dossier
  const rawPeriod =
    bt.period ||
    bt.date_range ||
    extractPeriodFromText(bt.folder) || // <— fallback rétabli
    [bt.year, bt.month].filter(Boolean).join("-") ||
    null;

  const period = fmtPeriod(rawPeriod) || "—";

  const win1 = bt.winrate ?? bt.winrate_tp1 ?? bt.tp1_winrate ?? bt.winrate1 ?? null;
  const trades = bt.trades ?? bt.total_trades ?? bt.count ?? null;

  const xlsx = bt.xlsx_filename || bt.xlsx || null;
  const apiKey = (typeof localStorage !== "undefined" && localStorage.getItem("apiKey")) || "";
  const downloadHref = (bt.folder && xlsx) ? downloadXlsxUrl(bt.folder, xlsx) : null;
  
  const [ask, setAsk] = useState(false);  // ouvre la boîte de confirmation
  const [open, setOpen] = useState(false); // ouvre la modale détails
  const { user } = useAuth ? useAuth() : { user: null };
  const [openInsights, setOpenInsights] = useState(false);




    // ✅ Fonstion de delete
        async function doDelete() {
        try {
            if (!bt?.folder) throw new Error("Dossier inconnu");

            const apiKey =
            user?.api_key || user?.apiKey || localStorage.getItem("apiKey") || "";

            const res = await fetch(
            `/api/user/backtests/delete/${encodeURIComponent(bt.folder)}`,
            {
                method: "DELETE",
                headers: { "X-API-Key": apiKey },
            }
            );

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            onDeleted?.(bt.folder);  // retire la carte côté parent
        } catch (e) {
            console.error("delete failed", e);
            alert("Suppression impossible : " + (e.message || "erreur serveur"));
        } finally {
            setAsk(false);
        }
        }

  return (
  <>
    <div className="dbt-card">
      {/* Header */}
      <div className="dbt-header">
        <div className="dbt-title">
          <span className="dbt-pair">{formatPair(pair)}</span>
          <span className="dbt-badge">{tf}</span>
        </div>
        <div className="dbt-period">{period}</div>
      </div>

      {/* Meta */}
      <div className="dbt-meta">
        <div className="dbt-row">
          <span className="dbt-label">Stratégie</span>
          <span className="dbt-val">{formatStrategy(strategy)}</span>
        </div>
        <div className="dbt-row">
          <span className="dbt-label">Winrate TP1</span>
          <span className="dbt-val">{fmtPct(win1)}</span>
        </div>
        <div className="dbt-row">
          <span className="dbt-label">Trades</span>
          <span className="dbt-val">{trades ?? "N/A"}</span>
        </div>
        <div className="dbt-row">
          {/* libellé plus explicite pour l’utilisateur */}
          <span className="dbt-label">Valeur pips</span>
          <span className="dbt-val">{pipLoading ? "…" : (pip ?? "—")}</span>
        </div>

      {/* ===== Action principale (centrée) : ouvrir l’overlay résultats ===== */}
      <div className="dbt-actions-primary center">
        <CTAButton leftIcon="" onClick={() => setOpenInsights(true)}>
          Voir résultats
        </CTAButton>
      </div>

      {/* ===== Actions secondaires : 50/50 ===== */}
      <div className="dbt-actions-secondary">
        <div className="col">
          {downloadHref ? (
            <DetailButton href={downloadHref} leftIcon="⬇️">
              Télécharger
            </DetailButton>
          ) : (
            <DetailButton disabled>.xlsx indisponible</DetailButton>
          )}
        </div>
        <div className="col">
          <DeleteButton onClick={() => setAsk(true)}>Supprimer</DeleteButton>
        </div>
      </div>



        {/* 🆕 Section "Mes épingles" pour CE backtest */}
        {/* Pins masqués sur la carte (demande produit) */}
        {false && <BacktestPinsSection folder={bt.folder} />}
      </div>

    {/* 🆕 Nouvel overlay Insights */}
    <BacktestInsightsOverlay open={openInsights} onClose={() => setOpenInsights(false)} item={bt} />


    <ConfirmDialog
      open={ask}
      title="Supprimer ce backtest ?"
      message="Cette action est irréversible."
      onCancel={() => setAsk(false)}
      onConfirm={doDelete}
    />
</div>
</>
);
}